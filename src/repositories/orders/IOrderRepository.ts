import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import type {
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";

// Transaction type for dependency injection (following inventory pattern)
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

export abstract class IOrderRepository {
  // Core CRUD operations
  abstract create(
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
  ): Promise<OrderWithDetails>;

  abstract findById(orderId: number): Promise<OrderType | null>;

  abstract findByIdWithRelations(
    orderId: number,
    relations?: OrderRelationOptions
  ): Promise<OrderWithDetails>;

  abstract findByOrderNumber(orderNumber: string): Promise<OrderType | null>;

  abstract updateStatus(
    orderId: number,
    status: OrderStatusEnum
  ): Promise<OrderType>;

  abstract updatePaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatusEnum
  ): Promise<OrderType>;

  abstract updateDeliveryInfo(
    orderId: number,
    deliveredBy: number,
    deliveryDate: Date
  ): Promise<OrderType>;

  abstract updateTotalAmount(
    orderId: number,
    totalAmount: string
  ): Promise<OrderType>;

  abstract delete(orderId: number): Promise<void>;

  // Business query operations
  abstract findByStoreAndStatus(
    storeId: number,
    status: OrderStatusEnum
  ): Promise<OrderType[]>;

  abstract findByCustomer(customerId: number): Promise<OrderType[]>;

  abstract findPendingOrdersByStore(storeId: number): Promise<OrderType[]>;

  abstract findOrdersByDateRange(
    startDate: Date,
    endDate: Date,
    storeId?: number
  ): Promise<OrderType[]>;

  // UX Design Support methods
  abstract findRecentOrdersByPhone(
    phone: string,
    limit?: number
  ): Promise<OrderType[]>;

  abstract findCustomerLastOrder(customerId: number): Promise<OrderType | null>;

  abstract findCustomerOrderHistory(
    customerId: number,
    limit?: number,
    offset?: number
  ): Promise<OrderType[]>;

  // Transaction-aware operations (critical for atomic operations)
  abstract createWithTransaction(
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
  ): Promise<OrderWithDetails>;

  abstract updateStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    status: OrderStatusEnum
  ): Promise<void>;

  abstract updatePaymentStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    paymentStatus: PaymentStatusEnum
  ): Promise<void>;

  // Utility methods
  abstract generateOrderNumber(): Promise<string>;

  abstract validateOrderData(
    storeId: number,
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }>;

  abstract calculateOrderTotal(
    orderItems: { quantity: number; unitPrice: string }[]
  ): string;

  // Business intelligence and analytics
  abstract getOrderMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersByStatus: Record<string, number>;
  }>;

  abstract getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number
  ): Promise<OrderType[]>;

  // Customer analytics support
  abstract getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }>;

  // Additional methods needed by service layer
  abstract update(
    orderId: number,
    updates: Partial<OrderType>
  ): Promise<OrderType>;

  abstract search(
    query: string,
    storeId?: number,
    status?: string
  ): Promise<OrderWithDetails[]>;

  abstract findByFilters(
    storeId?: number,
    customerId?: number,
    status?: OrderStatusEnum,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<OrderWithDetails[]>;

  abstract bulkUpdate(
    orderIds: number[],
    updates: Partial<OrderType>,
    updatedBy: number
  ): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }>;
}
