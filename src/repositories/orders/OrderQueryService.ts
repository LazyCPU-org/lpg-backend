import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import { customers } from "../../db/schemas/customers/customers";
import { storeAssignments } from "../../db/schemas/locations/store-assignments";
import {
  inventoryReservations,
  orderDeliveries,
  orderItems,
  orders,
  orderTransactionLinks,
} from "../../db/schemas/orders";
import { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import { users } from "../../db/schemas/user-management/users";
import {
  InventoryReservationWithDetails,
  OrderDeliveryWithDetails,
  OrderItemWithDetails,
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import { NotFoundError } from "../../utils/custom-errors";
import { IOrderQueryService } from "./IOrderQueryService";

export class OrderQueryService implements IOrderQueryService {
  // Helper method to add store filtering via store assignments
  private addStoreFilter(whereConditions: any[], storeId: number) {
    // For now, we'll filter directly by store assignment store ID
    // This requires a join, so methods using this need to be updated to use joins
    return eq(storeAssignments.storeId, storeId);
  }
  async findById(orderId: number): Promise<OrderType | null> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    return order || null;
  }

  async findByIdWithRelations(
    orderId: number,
    relations: OrderRelationOptions = {}
  ): Promise<OrderWithDetails> {
    // Start with base order
    const baseOrder = await this.findById(orderId);
    if (!baseOrder) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }

    // Build result object
    const result: OrderWithDetails = { ...baseOrder };

    // Load relations as requested
    if (relations.customer && baseOrder.customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.customerId, baseOrder.customerId),
      });
      result.customer = customer || undefined;
    }

    if (relations.assignation) {
      // Query store assignment if order has one assigned
      if (baseOrder.assignedTo) {
        const assignation = await db.query.storeAssignments.findFirst({
          where: eq(storeAssignments.assignmentId, baseOrder.assignedTo),
          with: {
            store: true,
            user: true,
          },
        });
        result.assignation = assignation || undefined;
      }
    }

    if (relations.items) {
      const items = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
        with: {
          tankType: true,
          inventoryItem: true,
          deliveredByUser: true,
        },
      });
      result.orderItems = items as OrderItemWithDetails[];
    }

    if (relations.reservations) {
      const reservations = await db.query.inventoryReservations.findMany({
        where: eq(inventoryReservations.orderId, orderId),
        with: {
          storeAssignment: true,
          tankType: true,
          inventoryItem: true,
        },
      });
      result.reservations = reservations as InventoryReservationWithDetails[];
    }

    if (relations.transactions) {
      const transactionLinks = await db.query.orderTransactionLinks.findMany({
        where: eq(orderTransactionLinks.orderId, orderId),
      });
      result.transactionLinks = transactionLinks;
    }

    if (relations.deliveries) {
      const deliveries = await db.query.orderDeliveries.findMany({
        where: eq(orderDeliveries.orderId, orderId),
        with: {
          deliveryUser: true,
        },
      });
      result.deliveries = deliveries as OrderDeliveryWithDetails[];
    }

    // Add created by and delivered by users
    if (baseOrder.createdBy) {
      const createdByUser = await db.query.users.findFirst({
        where: eq(users.userId, baseOrder.createdBy),
      });
      result.createdByUser = createdByUser || undefined;
    }

    // Note: deliveredBy removed - delivery user info now comes from store assignment

    return result;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderType | null> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    return order || null;
  }

  async findByStoreAssignmentAndStatus(
    storeAssignmentId: number,
    status: OrderStatusEnum
  ): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(eq(orders.assignedTo, storeAssignmentId), eq(orders.status, status))
      );
  }

  async findByCustomer(customerId: number): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async findPendingOrdersUnassigned(): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          isNull(orders.assignedTo),
          eq(orders.status, OrderStatusEnum.PENDING)
        )
      );
  }

  async findOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number
  ): Promise<OrderType[]> {
    const baseConditions = [
      gte(orders.createdAt, startDate),
      lte(orders.createdAt, endDate),
    ];

    if (storeId) {
      // Join with store assignments to filter by store
      const joinResults = await db
        .select()
        .from(orders)
        .leftJoin(
          storeAssignments,
          eq(orders.assignedTo, storeAssignments.assignmentId)
        )
        .where(and(...baseConditions, eq(storeAssignments.storeId, storeId)));
      // Extract just the orders from the join results
      return joinResults.map((result) => result.orders);
    }

    return await db
      .select()
      .from(orders)
      .where(and(...baseConditions));
  }

  async findRecentOrdersByPhone(
    phone: string,
    limit: number = 5
  ): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerPhone, phone))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async findCustomerLastOrder(customerId: number): Promise<OrderType | null> {
    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    return ordersList[0] || null;
  }

  async findCustomerOrderHistory(
    customerId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number
  ): Promise<OrderType[]> {
    const whereConditions = [eq(orders.status, status)];

    // If store filtering is needed, use join logic similar to findByFilters
    if (storeId) {
      // Join with store assignments to filter by store
      const joinResults = await db
        .select()
        .from(orders)
        .leftJoin(
          storeAssignments,
          eq(orders.assignedTo, storeAssignments.assignmentId)
        )
        .where(
          and(eq(orders.status, status), eq(storeAssignments.storeId, storeId))
        )
        .limit(limit || 50);

      // Extract just the orders from the join results
      return joinResults.map((result) => result.orders);
    }

    const baseQuery = db
      .select()
      .from(orders)
      .where(and(...whereConditions));

    if (limit) {
      return await baseQuery.limit(limit);
    }

    return await baseQuery;
  }

  async search(
    query: string,
    storeId?: number,
    status?: string
  ): Promise<OrderWithDetails[]> {
    const whereConditions = [];

    // Search in order number, customer name, or customer phone
    whereConditions.push(
      sql`(
        ${orders.orderNumber} ILIKE ${`%${query}%`} OR
        ${orders.customerName} ILIKE ${`%${query}%`} OR
        ${orders.customerPhone} ILIKE ${`%${query}%`}
      )`
    );

    // Store filtering would require join - for search simplicity, skip store filter for now
    // Note: If store filtering is needed for search, implement similar join logic as in findByFilters

    if (status) {
      whereConditions.push(eq(orders.status, status as OrderStatusEnum));
    }

    const orderResults = await db
      .select()
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.createdAt))
      .limit(50); // Reasonable limit for search results

    // Convert to OrderWithDetails by loading relations for each
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderResults) {
      const orderWithDetails = await this.findByIdWithRelations(order.orderId, {
        customer: true,
        assignation: true,
        items: true,
      });
      ordersWithDetails.push(orderWithDetails);
    }

    return ordersWithDetails;
  }

  async findByFilters(
    storeId?: number,
    customerId?: number,
    status?: OrderStatusEnum,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number,
    include?: OrderRelationOptions
  ): Promise<OrderWithDetails[]> {
    const whereConditions = [];

    // Store filtering via store assignments requires a join
    let needsStoreJoin = false;
    if (storeId) {
      needsStoreJoin = true;
    }

    if (customerId) {
      whereConditions.push(eq(orders.customerId, customerId));
    }

    if (status) {
      whereConditions.push(eq(orders.status, status));
    }

    if (startDate) {
      // Convert to start of day in GMT-5 timezone
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(5, 0, 0, 0); // GMT-5 = UTC+5 for start of day
      whereConditions.push(gte(orders.createdAt, startOfDay));
    }

    if (endDate) {
      // Convert to end of day in GMT-5 timezone
      const endOfDay = new Date(endDate);
      endOfDay.setDate(endOfDay.getDate() + 1); // Move to next day
      endOfDay.setUTCHours(4, 59, 59, 999); // GMT-5 end of day = next day 04:59:59 UTC
      whereConditions.push(lte(orders.createdAt, endOfDay));
    }

    let orderResults;

    if (needsStoreJoin) {
      // Join with store assignments to filter by store
      const joinResults = await db
        .select()
        .from(orders)
        .leftJoin(
          storeAssignments,
          eq(orders.assignedTo, storeAssignments.assignmentId)
        )
        .where(
          and(
            ...(whereConditions.length > 0 ? whereConditions : []),
            eq(storeAssignments.storeId, storeId!)
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(limit || 50)
        .offset(offset || 0);

      // Extract just the orders from the join results
      orderResults = joinResults.map((result) => result.orders);
    } else {
      // Regular query without store join
      const baseQuery = db
        .select()
        .from(orders)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(orders.createdAt));

      if (limit) {
        baseQuery.limit(limit);
      }

      if (offset) {
        baseQuery.offset(offset);
      }

      orderResults = await baseQuery;
    }

    // Convert to OrderWithDetails by loading relations for each
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderResults) {
      const relations = {
        customer: include?.customer || false,
        assignation: include?.assignation || false,
        items: include?.items || false,
        reservations: include?.reservations || false,
        transactions: include?.transactions || false,
        deliveries: include?.deliveries || false,
        invoice: include?.invoice || false,
      };

      const orderWithDetails = await this.findByIdWithRelations(
        order.orderId,
        relations
      );
      ordersWithDetails.push(orderWithDetails);
    }

    return ordersWithDetails;
  }
}
