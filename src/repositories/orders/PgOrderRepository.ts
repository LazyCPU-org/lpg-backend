import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orders } from "../../db/schemas/orders";
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import {
  NewOrderType,
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import { IOrderAnalyticsService } from "./IOrderAnalyticsService";
import { IOrderCoreRepository } from "./IOrderCoreRepository";
import { IOrderQueryService } from "./IOrderQueryService";
import { IOrderRepository } from "./IOrderRepository";
import { IOrderValidationService } from "./IOrderValidationService";
import { OrderAnalyticsService } from "./OrderAnalyticsService";
import { OrderQueryService } from "./OrderQueryService";
import { OrderUtils } from "./OrderUtils";
import { OrderValidationService } from "./OrderValidationService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgOrderRepository implements IOrderRepository, IOrderCoreRepository {
  private orderQueryService: IOrderQueryService;
  private orderAnalyticsService: IOrderAnalyticsService;
  private orderValidationService: IOrderValidationService;

  constructor() {
    this.orderQueryService = new OrderQueryService();
    this.orderAnalyticsService = new OrderAnalyticsService(this.orderQueryService);
    this.orderValidationService = new OrderValidationService();
  }
  async create(
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
    const orderNumber = await OrderUtils.generateOrderNumber();

    // Validate input data (no storeId needed for PENDING orders)
    const validation = await this.orderValidationService.validateOrderData(
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
      assignedTo: null, // No store assignment initially
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
    return this.orderQueryService.findByIdWithRelations(results[0].orderId, {
      customer: true,
      assignation: true, // Changed from 'store' to 'assignation'
      items: true,
    });
  }

  async findById(orderId: number): Promise<OrderType | null> {
    return this.orderQueryService.findById(orderId);
  }

  async findByIdWithRelations(
    orderId: number,
    relations: OrderRelationOptions = {}
  ): Promise<OrderWithDetails> {
    return this.orderQueryService.findByIdWithRelations(orderId, relations);
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderType | null> {
    return this.orderQueryService.findByOrderNumber(orderNumber);
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
    // TODO: Update to use store assignment filtering
    throw new Error("findByStoreAndStatus needs to be updated for store assignment workflow");
  }

  async findByCustomer(customerId: number): Promise<OrderType[]> {
    return this.orderQueryService.findByCustomer(customerId);
  }

  async findPendingOrdersByStore(storeId: number): Promise<OrderType[]> {
    // TODO: Update to use store assignment filtering  
    throw new Error("findPendingOrdersByStore needs to be updated for store assignment workflow");
  }

  async findOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number
  ): Promise<OrderType[]> {
    return this.orderQueryService.findOrdersByDateRange(startDate, endDate, storeId);
  }

  async findRecentOrdersByPhone(
    phone: string,
    limit: number = 5
  ): Promise<OrderType[]> {
    return this.orderQueryService.findRecentOrdersByPhone(phone, limit);
  }

  async findCustomerLastOrder(customerId: number): Promise<OrderType | null> {
    return this.orderQueryService.findCustomerLastOrder(customerId);
  }

  async findCustomerOrderHistory(
    customerId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<OrderType[]> {
    return this.orderQueryService.findCustomerOrderHistory(customerId, limit, offset);
  }

  async createWithTransaction(
    trx: DbTransaction,
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
    const orderNumber = await OrderUtils.generateOrderNumber();

    // Validate input data (no storeId needed for PENDING orders)
    const validation = await this.orderValidationService.validateOrderData(
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
      assignedTo: null, // No store assignment initially
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
        assignation: true, // Changed from 'store' to 'assignation'
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
    return OrderUtils.generateOrderNumber();
  }

  async validateOrderData(
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.orderValidationService.validateOrderData(
      customerName,
      customerPhone,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      createdBy,
      customerId
    );
  }

  calculateOrderTotal(
    orderItems: { quantity: number; unitPrice: string }[]
  ): string {
    return OrderUtils.calculateOrderTotal(orderItems);
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
    return this.orderAnalyticsService.getOrderMetrics(storeId, dateRange);
  }

  async getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number
  ): Promise<OrderType[]> {
    return this.orderQueryService.getOrdersByStatus(status, storeId, limit);
  }

  async getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }> {
    return this.orderAnalyticsService.getCustomerOrderAnalytics(customerId);
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
    return this.orderQueryService.search(query, storeId, status);
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
    return this.orderQueryService.findByFilters(
      storeId,
      customerId,
      status,
      startDate,
      endDate,
      limit,
      offset
    );
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
