import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
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
}