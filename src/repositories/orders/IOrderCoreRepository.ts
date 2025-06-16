import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import type {
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof import("../../db").db.transaction>[0]>[0];

export abstract class IOrderCoreRepository {
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

  abstract update(
    orderId: number,
    updates: Partial<OrderType>
  ): Promise<OrderType>;

  abstract delete(orderId: number): Promise<void>;

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

  abstract bulkUpdate(
    orderIds: number[],
    updates: Partial<OrderType>,
    updatedBy: number
  ): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }>;
}