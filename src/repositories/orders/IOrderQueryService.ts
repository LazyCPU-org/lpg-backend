import { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type {
  OrderRelationOptions,
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";

export abstract class IOrderQueryService {
  // Basic query operations
  abstract findById(orderId: number): Promise<OrderType | null>;

  abstract findByIdWithRelations(
    orderId: number,
    relations?: OrderRelationOptions
  ): Promise<OrderWithDetails>;

  abstract findByOrderNumber(orderNumber: string): Promise<OrderType | null>;

  // Business query operations
  abstract findByStoreAssignmentAndStatus(
    storeAssignmentId: number,
    status: OrderStatusEnum
  ): Promise<OrderType[]>;

  abstract findByCustomer(customerId: number): Promise<OrderType[]>;

  abstract findPendingOrdersUnassigned(): Promise<OrderType[]>;

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
}