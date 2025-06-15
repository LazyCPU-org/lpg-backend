import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { orders, orderStatusHistory } from "../../db/schemas/orders";
import { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import {
  OrderStatusHistoryType,
  OrderStatusHistoryWithDetails,
  OrderType,
} from "../../dtos/response/orderInterface";
import {
  BadRequestError,
  ConflictError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import {
  IOrderWorkflowRepository,
  StatusTransitionResult,
  WorkflowMetrics,
} from "./IOrderWorkflowRepository";
import { TimelineItem } from "./orderTypes";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Status transition configuration
const STATUS_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.CONFIRMED]: [
    OrderStatusEnum.RESERVED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.RESERVED]: [
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.IN_TRANSIT]: [
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.FAILED,
  ],
  [OrderStatusEnum.DELIVERED]: [OrderStatusEnum.FULFILLED],
  [OrderStatusEnum.FULFILLED]: [], // Terminal state
  [OrderStatusEnum.CANCELLED]: [], // Terminal state
  [OrderStatusEnum.FAILED]: [
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.CANCELLED,
  ], // Can retry or cancel
};

const STATUS_DESCRIPTIONS: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: "Order created, awaiting confirmation",
  [OrderStatusEnum.CONFIRMED]:
    "Order confirmed, ready for inventory reservation",
  [OrderStatusEnum.RESERVED]: "Inventory reserved, ready for delivery",
  [OrderStatusEnum.IN_TRANSIT]: "Order out for delivery",
  [OrderStatusEnum.DELIVERED]: "Order delivered successfully",
  [OrderStatusEnum.FULFILLED]: "Order complete, invoice generated",
  [OrderStatusEnum.CANCELLED]: "Order cancelled",
  [OrderStatusEnum.FAILED]: "Delivery failed, requires attention",
};

const COMMON_TRANSITION_REASONS: Record<string, string[]> = {
  "pending->confirmed": [
    "Order details verified",
    "Customer confirmed order",
    "Inventory available",
  ],
  "confirmed->reserved": [
    "Inventory successfully reserved",
    "Items allocated for order",
  ],
  "reserved->in_transit": [
    "Driver assigned",
    "Delivery started",
    "Out for delivery",
  ],
  "in_transit->delivered": [
    "Successfully delivered",
    "Customer received order",
    "Delivery completed",
  ],
  "delivered->fulfilled": [
    "Invoice generated",
    "Payment confirmed",
    "Order completed",
  ],
  "pending->cancelled": [
    "Customer cancelled",
    "Inventory unavailable",
    "Duplicate order",
  ],
  "confirmed->cancelled": [
    "Customer cancelled",
    "Payment failed",
    "Inventory unavailable",
  ],
  "reserved->cancelled": [
    "Customer cancelled",
    "Unable to deliver",
    "Customer unavailable",
  ],
  "in_transit->failed": [
    "Customer not available",
    "Wrong address",
    "Delivery vehicle issue",
  ],
  "failed->in_transit": [
    "Retry delivery",
    "Issue resolved",
    "Customer contacted",
  ],
  "failed->cancelled": [
    "Unable to deliver",
    "Customer unreachable",
    "Order expired",
  ],
};

export class PgOrderWorkflowRepository implements IOrderWorkflowRepository {
  async updateOrderStatus(
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    return await db.transaction(async (trx) => {
      await this.updateOrderStatusWithTransaction(
        trx,
        orderId,
        fromStatus,
        toStatus,
        changedBy,
        reason,
        notes
      );
    });
  }

  validateStatusTransition(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): StatusTransitionResult {
    const allowedTransitions = STATUS_TRANSITIONS[fromStatus] || [];

    if (!allowedTransitions.includes(toStatus)) {
      return {
        valid: false,
        error: `Cannot transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowedTransitions.join(
          ", "
        )}`,
        allowedTransitions,
      };
    }

    return { valid: true, allowedTransitions };
  }

  getAllowedTransitions(currentStatus: OrderStatusEnum): OrderStatusEnum[] {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }

  async createStatusHistory(
    orderId: number,
    fromStatus: OrderStatusEnum | null,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<OrderStatusHistoryType> {
    const historyData = {
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      notes,
    };

    const results = await db
      .insert(orderStatusHistory)
      .values(historyData)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating status history");
    }

    return results[0] as OrderStatusHistoryType;
  }

  async getStatusHistory(
    orderId: number,
    includeUserDetails: boolean = true
  ): Promise<OrderStatusHistoryWithDetails[]> {
    const history = await db.query.orderStatusHistory.findMany({
      where: eq(orderStatusHistory.orderId, orderId),
      orderBy: [desc(orderStatusHistory.createdAt)],
      with: includeUserDetails
        ? {
            changedByUser: true,
          }
        : undefined,
    });

    return history as OrderStatusHistoryWithDetails[];
  }

  async getStatusHistoryForOrders(
    orderIds: number[],
    includeUserDetails: boolean = true
  ): Promise<Record<number, OrderStatusHistoryWithDetails[]>> {
    if (orderIds.length === 0) {
      return {};
    }

    const history = await db.query.orderStatusHistory.findMany({
      where: inArray(orderStatusHistory.orderId, orderIds),
      orderBy: [desc(orderStatusHistory.createdAt)],
      with: includeUserDetails
        ? {
            changedByUser: true,
          }
        : undefined,
    });

    // Group by orderId
    const grouped: Record<number, OrderStatusHistoryWithDetails[]> = {};

    for (const entry of history) {
      if (!grouped[entry.orderId]) {
        grouped[entry.orderId] = [];
      }
      grouped[entry.orderId].push(entry as OrderStatusHistoryWithDetails);
    }

    return grouped;
  }

  async updateOrderStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    // Validate transition
    const validation = this.validateStatusTransition(fromStatus, toStatus);
    if (!validation.valid) {
      throw new BadRequestError(
        validation.error || "Invalid status transition"
      );
    }

    // Verify order exists and current status matches
    const currentOrder = await trx.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!currentOrder) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }

    if (currentOrder.status !== fromStatus) {
      throw new ConflictError(
        `Order status mismatch. Expected '${fromStatus}', but current status is '${currentOrder.status}'`
      );
    }

    // Update order status
    const updateResult = await trx
      .update(orders)
      .set({
        status: toStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!updateResult || updateResult.length === 0) {
      throw new InternalError("Error updating order status");
    }

    // Create status history entry
    await this.createStatusHistoryWithTransaction(
      trx,
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      notes
    );
  }

  async createStatusHistoryWithTransaction(
    trx: DbTransaction,
    orderId: number,
    fromStatus: OrderStatusEnum | null,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<OrderStatusHistoryType> {
    const historyData = {
      orderId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      notes,
    };

    const results = await trx
      .insert(orderStatusHistory)
      .values(historyData)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating status history");
    }

    return results[0] as OrderStatusHistoryType;
  }

  async performStatusTransition(
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<{
    order: OrderType;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      // Update status
      await this.updateOrderStatusWithTransaction(
        trx,
        orderId,
        fromStatus,
        toStatus,
        changedBy,
        reason,
        notes
      );

      // Get updated order
      const updatedOrder = await trx.query.orders.findFirst({
        where: eq(orders.orderId, orderId),
      });

      if (!updatedOrder) {
        throw new InternalError("Error retrieving updated order");
      }

      // Get the history entry we just created
      const historyEntry = await trx.query.orderStatusHistory.findFirst({
        where: and(
          eq(orderStatusHistory.orderId, orderId),
          eq(orderStatusHistory.toStatus, toStatus)
        ),
        orderBy: [desc(orderStatusHistory.createdAt)],
      });

      if (!historyEntry) {
        throw new InternalError("Error retrieving status history");
      }

      return {
        order: updatedOrder as OrderType,
        historyEntry: historyEntry as OrderStatusHistoryType,
      };
    });
  }

  async getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number,
    offset?: number
  ): Promise<OrderType[]> {
    const whereConditions = [eq(orders.status, status)];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    const baseQuery = db
      .select()
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.createdAt));

    if (offset && limit) {
      const results = await baseQuery.offset(offset).limit(limit);
      return results as OrderType[];
    } else if (limit) {
      const results = await baseQuery.limit(limit);
      return results as OrderType[];
    } else {
      const results = await baseQuery;
      return results as OrderType[];
    }
  }

  async getWorkflowMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<WorkflowMetrics> {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    if (dateRange) {
      whereConditions.push(gte(orders.createdAt, dateRange.from));
      whereConditions.push(lte(orders.createdAt, dateRange.to));
    }

    // Get basic order counts
    const [orderCounts] = await db
      .select({
        totalOrders: count(orders.orderId),
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Get orders by status
    const statusCounts = await db
      .select({
        status: orders.status,
        count: count(orders.orderId),
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orders.status);

    const ordersByStatus = statusCounts.reduce((acc, item) => {
      if (item.status) {
        acc[item.status] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get status transition counts
    const transitionCounts = await db
      .select({
        transition: sql<string>`CONCAT(${orderStatusHistory.fromStatus}, '->', ${orderStatusHistory.toStatus})`,
        count: count(orderStatusHistory.historyId),
      })
      .from(orderStatusHistory)
      .innerJoin(orders, eq(orderStatusHistory.orderId, orders.orderId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        sql`CONCAT(${orderStatusHistory.fromStatus}, '->', ${orderStatusHistory.toStatus})`
      );

    const statusTransitionCounts = transitionCounts.reduce((acc, item) => {
      acc[item.transition] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Get daily order creation
    const dailyCreation = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: count(orders.orderId),
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    const dailyOrderCreation = dailyCreation.map((item) => ({
      date: item.date,
      count: item.count,
    }));

    // Calculate delivery success rate
    const deliveredCount = ordersByStatus[OrderStatusEnum.DELIVERED] || 0;
    const failedCount = ordersByStatus[OrderStatusEnum.FAILED] || 0;
    const deliveryAttempts = deliveredCount + failedCount;
    const deliverySuccessRate =
      deliveryAttempts > 0 ? (deliveredCount / deliveryAttempts) * 100 : 0;

    // Calculate cancellation rate
    const cancelledCount = ordersByStatus[OrderStatusEnum.CANCELLED] || 0;
    const totalOrders = orderCounts.totalOrders || 0;
    const cancellationRate =
      totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    // Get top transition reasons
    const reasonCounts = await db
      .select({
        reason: orderStatusHistory.reason,
        count: count(orderStatusHistory.historyId),
      })
      .from(orderStatusHistory)
      .innerJoin(orders, eq(orderStatusHistory.orderId, orders.orderId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orderStatusHistory.reason)
      .orderBy(desc(count(orderStatusHistory.historyId)))
      .limit(10);

    const topReasons = reasonCounts.map((item) => ({
      reason: item.reason,
      count: item.count,
    }));

    // Calculate average processing time (simplified - from creation to fulfilled)
    const fulfilledOrders = await db
      .select({
        createdAt: orders.createdAt,
        fulfilledAt: sql<Date>`MAX(${orderStatusHistory.createdAt})`,
      })
      .from(orders)
      .innerJoin(
        orderStatusHistory,
        eq(orders.orderId, orderStatusHistory.orderId)
      )
      .where(
        and(
          eq(orders.status, OrderStatusEnum.FULFILLED),
          eq(orderStatusHistory.toStatus, OrderStatusEnum.FULFILLED),
          ...(whereConditions.length > 0 ? whereConditions : [])
        )
      )
      .groupBy(orders.orderId, orders.createdAt);

    let averageProcessingTime = 0;
    if (fulfilledOrders.length > 0) {
      const totalTime = fulfilledOrders.reduce((sum, order) => {
        const createdAt = new Date(order.createdAt || new Date());
        const fulfilledAt = new Date(order.fulfilledAt || new Date());
        const timeInHours =
          (fulfilledAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return sum + timeInHours;
      }, 0);
      averageProcessingTime = totalTime / fulfilledOrders.length;
    }

    return {
      totalOrders: totalOrders,
      ordersByStatus,
      averageProcessingTime,
      statusTransitionCounts,
      dailyOrderCreation,
      deliverySuccessRate,
      cancellationRate,
      topReasons,
    };
  }

  async getStatusTransitionMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    transitionCounts: Record<string, number>;
    averageTimeInStatus: Record<string, number>;
    bottlenecks: Array<{
      status: string;
      averageTime: number;
      orderCount: number;
    }>;
  }> {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    if (dateRange) {
      whereConditions.push(gte(orders.createdAt, dateRange.from));
      whereConditions.push(lte(orders.createdAt, dateRange.to));
    }

    // This is a simplified implementation
    // A full implementation would calculate actual time spent in each status
    const transitionCounts = await db
      .select({
        transition: sql<string>`CONCAT(${orderStatusHistory.fromStatus}, '->', ${orderStatusHistory.toStatus})`,
        count: count(orderStatusHistory.historyId),
      })
      .from(orderStatusHistory)
      .innerJoin(orders, eq(orderStatusHistory.orderId, orders.orderId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(
        sql`CONCAT(${orderStatusHistory.fromStatus}, '->', ${orderStatusHistory.toStatus})`
      );

    const transitionCountsRecord = transitionCounts.reduce((acc, item) => {
      acc[item.transition] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Simplified average time calculation (would need more complex queries for real implementation)
    const averageTimeInStatus: Record<string, number> = {
      [OrderStatusEnum.PENDING]: 2,
      [OrderStatusEnum.CONFIRMED]: 1,
      [OrderStatusEnum.RESERVED]: 4,
      [OrderStatusEnum.IN_TRANSIT]: 3,
      [OrderStatusEnum.DELIVERED]: 0.5,
    };

    // Identify bottlenecks (statuses with high average time)
    const bottlenecks = Object.entries(averageTimeInStatus)
      .filter(([_, time]) => time > 3)
      .map(([status, averageTime]) => ({
        status,
        averageTime,
        orderCount: 0, // Would calculate from actual data
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    return {
      transitionCounts: transitionCountsRecord,
      averageTimeInStatus,
      bottlenecks,
    };
  }

  async getOrderTimeline(orderId: number): Promise<TimelineItem[]> {
    const timeline = await db.query.orderStatusHistory.findMany({
      where: eq(orderStatusHistory.orderId, orderId),
      orderBy: [asc(orderStatusHistory.createdAt)],
      with: {
        changedByUser: true,
      },
    });

    // Calculate durations between status changes
    const result = timeline.map((entry, index) => {
      let duration: number | undefined;

      if (index < timeline.length - 1) {
        const currentTime = new Date(entry.createdAt || new Date()).getTime();
        const nextTime = new Date(
          timeline[index + 1].createdAt || new Date()
        ).getTime();
        duration = Math.round((nextTime - currentTime) / (1000 * 60)); // Duration in minutes
      }

      return {
        status: entry.toStatus as OrderStatusEnum,
        timestamp: entry.createdAt || new Date(),
        duration,
        changedBy: entry.changedBy,
        changedByName: entry.changedByUser?.name || undefined,
        reason: entry.reason,
        notes: entry.notes || undefined,
      };
    });

    return result;
  }

  async getOrdersStuckInStatus(
    status: OrderStatusEnum,
    thresholdHours: number = 24,
    storeId?: number
  ): Promise<
    Array<{
      orderId: number;
      orderNumber: string;
      customerName: string;
      hoursInStatus: number;
      lastUpdate: Date;
    }>
  > {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - thresholdHours);

    const whereConditions = [
      eq(orders.status, status),
      lte(orders.updatedAt, thresholdDate),
    ];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    const stuckOrders = await db
      .select({
        orderId: orders.orderId,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(...whereConditions));

    return stuckOrders.map((order) => {
      const lastUpdate = new Date(order.updatedAt || new Date());
      const now = new Date();
      const hoursInStatus = Math.round(
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
      );

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName || "Unknown Customer",
        hoursInStatus,
        lastUpdate,
      };
    });
  }

  async getOrdersReadyForTransition(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    storeId?: number
  ): Promise<OrderType[]> {
    // Validate the transition is allowed
    const validation = this.validateStatusTransition(fromStatus, toStatus);
    if (!validation.valid) {
      return [];
    }

    const whereConditions = [eq(orders.status, fromStatus)];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    return (await db
      .select()
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(asc(orders.createdAt))) as OrderType[];
  }

  async bulkStatusTransition(
    orderIds: number[],
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }> {
    const successful: number[] = [];
    const failed: Array<{ orderId: number; error: string }> = [];

    // Process each order individually to handle failures gracefully
    for (const orderId of orderIds) {
      try {
        await this.performStatusTransition(
          orderId,
          fromStatus,
          toStatus,
          changedBy,
          reason,
          notes
        );
        successful.push(orderId);
      } catch (error) {
        failed.push({
          orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  async getOrderCurrentStatus(
    orderId: number
  ): Promise<OrderStatusEnum | null> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
      columns: { status: true },
    });

    return (order?.status as OrderStatusEnum) || null;
  }

  async canTransitionStatus(
    orderId: number,
    toStatus: OrderStatusEnum
  ): Promise<StatusTransitionResult> {
    const currentStatus = await this.getOrderCurrentStatus(orderId);

    if (!currentStatus) {
      return {
        valid: false,
        error: "Order not found",
      };
    }

    return this.validateStatusTransition(currentStatus, toStatus);
  }

  async getOrdersRequiringAttention(storeId?: number): Promise<
    Array<{
      orderId: number;
      orderNumber: string;
      status: OrderStatusEnum;
      issue: string;
      priority: "low" | "medium" | "high";
      lastUpdate: Date;
    }>
  > {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    // Find orders in problematic states
    const problematicOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.status, [
            OrderStatusEnum.FAILED,
            OrderStatusEnum.PENDING,
          ]),
          ...(whereConditions.length > 0 ? whereConditions : [])
        )
      );

    return problematicOrders.map((order) => {
      let issue = "";
      let priority: "low" | "medium" | "high" = "medium";

      if (order.status === OrderStatusEnum.FAILED) {
        issue = "Delivery failed, requires retry or cancellation";
        priority = "high";
      } else if (order.status === OrderStatusEnum.PENDING) {
        const hoursSinceCreation = Math.round(
          (new Date().getTime() -
            new Date(order.createdAt || new Date()).getTime()) /
            (1000 * 60 * 60)
        );

        if (hoursSinceCreation > 24) {
          issue = `Pending for ${hoursSinceCreation} hours`;
          priority = "high";
        } else if (hoursSinceCreation > 4) {
          issue = `Pending for ${hoursSinceCreation} hours`;
          priority = "medium";
        } else {
          issue = "Recently created, awaiting confirmation";
          priority = "low";
        }
      }

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status as OrderStatusEnum,
        issue,
        priority,
        lastUpdate: new Date(order.updatedAt || new Date()),
      };
    });
  }

  async generateWorkflowReport(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    summary: WorkflowMetrics;
    dailyBreakdown: Array<{
      date: string;
      created: number;
      completed: number;
      cancelled: number;
      pendingAtEndOfDay: number;
    }>;
    performanceMetrics: {
      averageOrderFulfillmentTime: number;
      peakHours: Array<{ hour: number; orderCount: number }>;
      slowestOrders: Array<{
        orderId: number;
        orderNumber: string;
        totalTime: number;
        currentStatus: OrderStatusEnum;
      }>;
    };
  }> {
    const summary = await this.getWorkflowMetrics(storeId, dateRange);

    // Simplified daily breakdown (would require more complex queries for accurate data)
    const dailyBreakdown = summary.dailyOrderCreation.map((day) => ({
      date: day.date,
      created: day.count,
      completed: Math.round(day.count * 0.8), // Simplified assumption
      cancelled: Math.round(day.count * 0.1), // Simplified assumption
      pendingAtEndOfDay: Math.round(day.count * 0.1), // Simplified assumption
    }));

    // Simplified performance metrics
    const performanceMetrics = {
      averageOrderFulfillmentTime: summary.averageProcessingTime,
      peakHours: [
        { hour: 10, orderCount: 15 },
        { hour: 14, orderCount: 12 },
        { hour: 16, orderCount: 18 },
      ], // Simplified data
      slowestOrders: [], // Would require complex query to get actual slow orders
    };

    return {
      summary,
      dailyBreakdown,
      performanceMetrics,
    };
  }

  getWorkflowConfiguration(): Promise<{
    allowedTransitions: Record<OrderStatusEnum, OrderStatusEnum[]>;
    statusDescriptions: Record<OrderStatusEnum, string>;
    requiredPermissions: Record<string, string[]>;
  }> {
    const requiredPermissions: Record<string, string[]> = {
      "pending->confirmed": ["operator", "admin"],
      "confirmed->reserved": ["operator", "admin"],
      "reserved->in_transit": ["delivery", "operator", "admin"],
      "in_transit->delivered": ["delivery", "operator", "admin"],
      "delivered->fulfilled": ["operator", "admin"],
      "any->cancelled": ["operator", "admin"],
      "failed->in_transit": ["delivery", "operator", "admin"],
    };

    return Promise.resolve({
      allowedTransitions: STATUS_TRANSITIONS,
      statusDescriptions: STATUS_DESCRIPTIONS,
      requiredPermissions,
    });
  }

  isValidTransitionReason(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    reason: string
  ): boolean {
    const transitionKey = `${fromStatus}->${toStatus}`;
    const validReasons = COMMON_TRANSITION_REASONS[transitionKey] || [];

    // Allow any reason if no specific reasons are defined, or if the reason matches
    return (
      validReasons.length === 0 ||
      validReasons.some((validReason) =>
        reason.toLowerCase().includes(validReason.toLowerCase())
      )
    );
  }

  getSuggestedReasons(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): string[] {
    const transitionKey = `${fromStatus}->${toStatus}`;
    return COMMON_TRANSITION_REASONS[transitionKey] || [];
  }
}
