import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import {
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import { IOrderCoreRepository } from "./IOrderCoreRepository";

/**
 * Composed interface that includes all order-related functionality.
 * This interface aggregates core repository, query, analytics, and validation capabilities.
 */
export abstract class IOrderRepository extends IOrderCoreRepository {
  // Query methods
  abstract findById(orderId: number): Promise<OrderType | null>;
  abstract findByIdWithRelations(
    orderId: number,
    relations?: OrderRelationOptions
  ): Promise<OrderWithDetails>;
  abstract findByOrderNumber(orderNumber: string): Promise<OrderType | null>;
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
  abstract getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number
  ): Promise<OrderType[]>;
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

  // Analytics methods
  abstract getOrderMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersByStatus: Record<string, number>;
  }>;
  abstract getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }>;

  // Validation methods
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

  // Utility methods (static utilities from OrderUtils)
  abstract generateOrderNumber(): Promise<string>;
  abstract calculateOrderTotal(
    orderItems: { quantity: number; unitPrice: string }[]
  ): string;
}
