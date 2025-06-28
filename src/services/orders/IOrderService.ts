import type { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type { CreateOrderRequest, OrderItemRequest } from "../../dtos/request/orderDTO";
import type { OrderWithDetails } from "../../dtos/response/orderInterface";

/**
 * Core Order Service Interface
 *
 * Handles the main business logic for order management following
 * simple parameter patterns from inventory services.
 */
export abstract class IOrderService {
  // Core Order Operations
  abstract createOrder(
    orderData: CreateOrderRequest,
    createdBy: number
  ): Promise<OrderWithDetails>;

  abstract getOrder(
    orderId: number,
    includeItems?: boolean,
    includeCustomer?: boolean,
    includeHistory?: boolean
  ): Promise<OrderWithDetails | null>;

  abstract updateOrder(
    orderId: number,
    customerName?: string,
    customerPhone?: string,
    deliveryAddress?: string,
    notes?: string,
    userId?: number
  ): Promise<OrderWithDetails>;

  abstract deleteOrder(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<void>;

  // Test-aligned validation methods (primary interface)
  abstract validateOrderRequest(
    request: CreateOrderRequest
  ): Promise<{ valid: boolean; errors: string[] }>;

  abstract validateStoreAvailability(storeId: number): Promise<boolean>;

  // Order Calculations (test-aligned methods)  
  abstract calculateOrderTotal(items: OrderItemRequest[]): string;

  abstract generateOrderNumber(): string;

  // Legacy calculation methods (for backward compatibility)
  abstract calculateOrderTotalDetailed(
    items: Array<{
      itemType: "tank" | "item";
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      unitPrice: string;
    }>
  ): Promise<{
    subtotal: string;
    tax: string;
    total: string;
  }>;

  abstract generateOrderNumberForStore(storeId: number): Promise<string>;

  // Order Retrieval
  abstract findOrders(
    storeId?: number,
    customerId?: number,
    status?: OrderStatusEnum,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<OrderWithDetails[]>;

  abstract findOrdersByCustomer(
    customerId: number,
    limit?: number
  ): Promise<OrderWithDetails[]>;

  abstract searchOrders(
    query: string,
    storeId?: number,
    status?: OrderStatusEnum
  ): Promise<OrderWithDetails[]>;

  // UX Support Methods  
  abstract getCustomerOrderHistory(
    phoneNumber: string,
    limit?: number
  ): Promise<OrderWithDetails[]>;

  // Analytics
  abstract getOrderMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: string;
    totalRevenue: string;
  }>;

  // Order State
  abstract canModifyOrder(orderId: number): Promise<boolean>;
  abstract canCancelOrder(orderId: number): Promise<boolean>;
}
