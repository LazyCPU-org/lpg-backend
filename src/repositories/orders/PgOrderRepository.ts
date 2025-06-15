import { and, avg, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { db } from "../../db";
import { customers } from "../../db/schemas/customers/customers";
import { stores } from "../../db/schemas/locations/stores";
import {
  inventoryReservations,
  orderDeliveries,
  orderItems,
  orders,
  orderTransactionLinks,
} from "../../db/schemas/orders";
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import { users } from "../../db/schemas/user-management/users";
import {
  InventoryReservationWithDetails,
  NewOrderType,
  OrderDeliveryWithDetails,
  OrderItemWithDetails,
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import { IOrderRepository } from "./IOrderRepository";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgOrderRepository implements IOrderRepository {
  async create(
    storeId: number,
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number,
    locationReference?: string,
    priority?: number,
    notes?: string
  ): Promise<OrderWithDetails> {
    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Validate input data
    const validation = await this.validateOrderData(
      storeId,
      customerName,
      customerPhone,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      createdBy,
      customerId
    );

    if (!validation.valid) {
      throw new BadRequestError(
        `Invalid order data: ${validation.errors.join(", ")}`
      );
    }

    const orderData: NewOrderType = {
      orderNumber,
      storeId,
      customerName,
      customerPhone,
      deliveryAddress,
      locationReference,
      status: OrderStatusEnum.PENDING,
      priority: priority || 3,
      paymentMethod,
      paymentStatus,
      totalAmount: "0.00",
      createdBy,
      customerId,
      notes,
    };

    const results = await db.insert(orders).values(orderData).returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating order");
    }

    // Return order with details
    return this.findByIdWithRelations(results[0].orderId, {
      customer: true,
      store: true,
      items: true,
    });
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

    if (relations.store) {
      const store = await db.query.stores.findFirst({
        where: eq(stores.storeId, baseOrder.storeId),
      });
      result.store = store || undefined;
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

    if (baseOrder.deliveredBy) {
      const deliveredByUser = await db.query.users.findFirst({
        where: eq(users.userId, baseOrder.deliveredBy),
      });
      result.deliveredByUser = deliveredByUser || undefined;
    }

    return result;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderType | null> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    return order || null;
  }

  async updateStatus(
    orderId: number,
    status: OrderStatusEnum
  ): Promise<OrderType> {
    const current = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating order status");
    }

    return results[0];
  }

  async updatePaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatusEnum
  ): Promise<OrderType> {
    const current = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await db
      .update(orders)
      .set({
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating payment status");
    }

    return results[0];
  }

  async updateDeliveryInfo(
    orderId: number,
    deliveredBy: number,
    deliveryDate: Date
  ): Promise<OrderType> {
    const current = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await db
      .update(orders)
      .set({
        deliveredBy,
        deliveryDate,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating delivery info");
    }

    return results[0];
  }

  async updateTotalAmount(
    orderId: number,
    totalAmount: string
  ): Promise<OrderType> {
    const current = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await db
      .update(orders)
      .set({
        totalAmount,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating total amount");
    }

    return results[0];
  }

  async delete(orderId: number): Promise<void> {
    const result = await db.delete(orders).where(eq(orders.orderId, orderId));

    if (result.rowCount === 0) {
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }
  }

  async findByStoreAndStatus(
    storeId: number,
    status: OrderStatusEnum
  ): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(and(eq(orders.storeId, storeId), eq(orders.status, status)));
  }

  async findByCustomer(customerId: number): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async findPendingOrdersByStore(storeId: number): Promise<OrderType[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.status, OrderStatusEnum.PENDING)
        )
      );
  }

  async findOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number
  ): Promise<OrderType[]> {
    const whereConditions = [
      gte(orders.createdAt, startDate),
      lte(orders.createdAt, endDate),
    ];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    return await db
      .select()
      .from(orders)
      .where(and(...whereConditions));
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

  async createWithTransaction(
    trx: DbTransaction,
    storeId: number,
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number,
    locationReference?: string,
    priority?: number,
    notes?: string
  ): Promise<OrderWithDetails> {
    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Validate input data
    const validation = await this.validateOrderData(
      storeId,
      customerName,
      customerPhone,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      createdBy,
      customerId
    );

    if (!validation.valid) {
      throw new BadRequestError(
        `Invalid order data: ${validation.errors.join(", ")}`
      );
    }

    const orderData: NewOrderType = {
      orderNumber,
      storeId,
      customerName,
      customerPhone,
      deliveryAddress,
      locationReference,
      status: OrderStatusEnum.PENDING,
      priority: priority || 3,
      paymentMethod,
      paymentStatus,
      totalAmount: "0.00",
      createdBy,
      customerId,
      notes,
    };

    const results = await trx.insert(orders).values(orderData).returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating order");
    }

    // For transaction context, we need to query within the same transaction
    const createdOrder = await trx.query.orders.findFirst({
      where: eq(orders.orderId, results[0].orderId),
      with: {
        customer: true,
        store: true,
        createdByUser: true,
      },
    });

    if (!createdOrder) {
      throw new InternalError("Error retrieving created order");
    }

    return createdOrder as OrderWithDetails;
  }

  async updateStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    status: OrderStatusEnum
  ): Promise<void> {
    const current = await trx.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await trx
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating order status");
    }
  }

  async updatePaymentStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    paymentStatus: PaymentStatusEnum
  ): Promise<void> {
    const current = await trx.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    const results = await trx
      .update(orders)
      .set({
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating payment status");
    }
  }

  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Get the latest order number for this year
    const latestOrder = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(sql`${orders.orderNumber} LIKE ${`ORD-${year}-%`}`)
      .orderBy(desc(orders.orderNumber))
      .limit(1);

    let nextSequence = 1;

    if (latestOrder.length > 0) {
      const match = latestOrder[0].orderNumber.match(/ORD-\d{4}-(\d{3})/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    return `ORD-${year}-${nextSequence.toString().padStart(3, "0")}`;
  }

  async validateOrderData(
    storeId: number,
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate store exists
    const store = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });
    if (!store) {
      errors.push("Store not found");
    }

    // Validate creating user exists
    const user = await db.query.users.findFirst({
      where: eq(users.userId, createdBy),
    });
    if (!user) {
      errors.push("Creating user not found");
    }

    // Validate customer exists if customerId provided
    if (customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.customerId, customerId),
      });
      if (!customer) {
        errors.push("Customer not found");
      }
    }

    // Validate required fields
    if (!customerName.trim()) {
      errors.push("Customer name is required");
    }
    if (!customerPhone.trim()) {
      errors.push("Customer phone is required");
    }
    if (!deliveryAddress.trim()) {
      errors.push("Delivery address is required");
    }

    // Validate enum values
    if (!Object.values(PaymentMethodEnum).includes(paymentMethod)) {
      errors.push("Invalid payment method");
    }
    if (!Object.values(PaymentStatusEnum).includes(paymentStatus)) {
      errors.push("Invalid payment status");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  calculateOrderTotal(
    orderItems: { quantity: number; unitPrice: string }[]
  ): string {
    const total = orderItems.reduce((sum, item) => {
      const itemTotal = item.quantity * parseFloat(item.unitPrice);
      return sum + itemTotal;
    }, 0);

    return total.toFixed(2);
  }

  async getOrderMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersByStatus: Record<string, number>;
  }> {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    if (dateRange) {
      whereConditions.push(gte(orders.createdAt, dateRange.from));
      whereConditions.push(lte(orders.createdAt, dateRange.to));
    }

    // Get basic metrics
    const [metrics] = await db
      .select({
        totalOrders: count(orders.orderId),
        totalRevenue: sum(orders.totalAmount),
        averageOrderValue: avg(orders.totalAmount),
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

    return {
      totalOrders: metrics.totalOrders || 0,
      totalRevenue: metrics.totalRevenue || "0.00",
      averageOrderValue: metrics.averageOrderValue || "0.00",
      ordersByStatus,
    };
  }

  async getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number
  ): Promise<OrderType[]> {
    const whereConditions = [eq(orders.status, status)];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
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

  async getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }> {
    // Get basic customer order metrics
    const [metrics] = await db
      .select({
        totalOrders: count(orders.orderId),
        totalSpent: sum(orders.totalAmount),
        averageOrderValue: avg(orders.totalAmount),
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    // Get last order date
    const lastOrder = await this.findCustomerLastOrder(customerId);

    // Get most used payment method
    const [paymentMethod] = await db
      .select({
        paymentMethod: orders.paymentMethod,
        count: count(orders.orderId),
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .groupBy(orders.paymentMethod)
      .orderBy(desc(count(orders.orderId)))
      .limit(1);

    // Calculate order frequency (simple heuristic based on total orders)
    const totalOrders = metrics.totalOrders || 0;
    let orderFrequency: "high" | "medium" | "low" = "low";

    if (totalOrders >= 20) {
      orderFrequency = "high";
    } else if (totalOrders >= 5) {
      orderFrequency = "medium";
    }

    return {
      totalOrders: totalOrders,
      totalSpent: metrics.totalSpent || "0.00",
      averageOrderValue: metrics.averageOrderValue || "0.00",
      lastOrderDate: lastOrder?.createdAt || null,
      preferredPaymentMethod: paymentMethod?.paymentMethod || null,
      orderFrequency,
    };
  }

  async update(
    orderId: number,
    updates: Partial<OrderType>
  ): Promise<OrderType> {
    const current = await db.query.orders.findFirst({
      where: eq(orders.orderId, orderId),
    });

    if (!current) {
      throw new NotFoundError("Order not found");
    }

    // Filter out readonly/computed fields
    const { orderId: _, createdAt, ...allowedUpdates } = updates;

    const results = await db
      .update(orders)
      .set({
        ...allowedUpdates,
        updatedAt: new Date(),
      } as Partial<NewOrderType>)
      .where(eq(orders.orderId, orderId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating order");
    }

    return results[0];
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

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

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
        store: true,
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
    offset?: number
  ): Promise<OrderWithDetails[]> {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    if (customerId) {
      whereConditions.push(eq(orders.customerId, customerId));
    }

    if (status) {
      whereConditions.push(eq(orders.status, status));
    }

    if (startDate) {
      whereConditions.push(gte(orders.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(orders.createdAt, endDate));
    }

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

    const orderResults = await baseQuery;

    // Convert to OrderWithDetails by loading relations for each
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of orderResults) {
      const orderWithDetails = await this.findByIdWithRelations(order.orderId, {
        customer: true,
        store: true,
        items: true,
      });
      ordersWithDetails.push(orderWithDetails);
    }

    return ordersWithDetails;
  }

  async bulkUpdate(
    orderIds: number[],
    updates: Partial<OrderType>,
    updatedBy: number
  ): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }> {
    const successful: number[] = [];
    const failed: Array<{ orderId: number; error: string }> = [];

    for (const orderId of orderIds) {
      try {
        await this.update(orderId, {
          ...updates,
          updatedAt: new Date(),
        });
        successful.push(orderId);
      } catch (error) {
        failed.push({
          orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      successful,
      failed,
    };
  }
}
