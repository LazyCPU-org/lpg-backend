/**
 * Mock Order Repository for Testing
 * 
 * Provides mock implementations of order repositories to avoid database dependencies
 * during unit testing. Follows existing patterns from inventory transaction tests.
 */

import {
  OrderType,
  NewOrderType,
  OrderItemType,
  NewOrderItemType,
  InventoryReservationType,
  NewInventoryReservationType,
  OrderStatusHistoryType,
  NewOrderStatusHistoryType,
  OrderTransactionLinkType,
  NewOrderTransactionLinkType,
  OrderWithDetails,
  OrderRelationOptions,
  AvailabilityResult,
  OrderTransition,
  ReservationResult,
  FulfillmentResult,
  RestoreResult,
} from '../../../../dtos/response/orderInterface';

import {
  CreateOrderRequest,
  GetOrdersRequest,
  CheckAvailabilityRequest,
  UpdateOrderStatusRequest,
} from '../../../../dtos/request/orderDTO';

// Mock interfaces based on actual service structure (following inventory patterns)
export interface IOrderRepository {
  createOrder(orderData: NewOrderType): Promise<OrderType>;
  getOrderById(orderId: number, include?: OrderRelationOptions): Promise<OrderWithDetails | null>;
  updateOrderStatus(orderId: number, status: string, userId: number): Promise<OrderType>;
  getOrdersByFilters(filters: GetOrdersRequest): Promise<OrderWithDetails[]>;
  cancelOrder(orderId: number, reason: string, userId: number): Promise<OrderType>;
  // Transaction-aware methods
  createOrderWithTransaction(orderData: NewOrderType, trx: any): Promise<OrderType>;
  updateOrderStatusWithTransaction(orderId: number, status: string, userId: number, trx: any): Promise<OrderType>;
}

export interface IReservationRepository {
  createReservationsForOrder(orderId: number, reservations: NewInventoryReservationType[]): Promise<InventoryReservationType[]>;
  getActiveReservations(orderId: number): Promise<InventoryReservationType[]>;
  fulfillReservations(orderId: number, userId: number): Promise<InventoryReservationType[]>;
  restoreReservations(orderId: number, reason: string): Promise<InventoryReservationType[]>;
  checkAvailability(request: CheckAvailabilityRequest): Promise<AvailabilityResult>;
  // Transaction-aware methods
  createReservationsWithTransaction(orderId: number, reservations: NewInventoryReservationType[], trx: any): Promise<InventoryReservationType[]>;
  fulfillReservationsWithTransaction(orderId: number, userId: number, trx: any): Promise<InventoryReservationType[]>;
  restoreReservationsWithTransaction(orderId: number, reason: string, trx: any): Promise<InventoryReservationType[]>;
}

export interface IOrderWorkflowRepository {
  createStatusHistory(historyData: NewOrderStatusHistoryType): Promise<OrderStatusHistoryType>;
  createOrderTransactionLink(linkData: NewOrderTransactionLinkType): Promise<OrderTransactionLinkType>;
  // Transaction-aware methods
  createStatusHistoryWithTransaction(historyData: NewOrderStatusHistoryType, trx: any): Promise<OrderStatusHistoryType>;
  createOrderTransactionLinkWithTransaction(linkData: NewOrderTransactionLinkType, trx: any): Promise<OrderTransactionLinkType>;
}

// Mock repository factories (following inventory transaction patterns)
export const createMockOrderRepository = (): jest.Mocked<IOrderRepository> => ({
  createOrder: jest.fn(),
  getOrderById: jest.fn(),
  updateOrderStatus: jest.fn(),
  getOrdersByFilters: jest.fn(),
  cancelOrder: jest.fn(),
  createOrderWithTransaction: jest.fn(),
  updateOrderStatusWithTransaction: jest.fn(),
});

export const createMockReservationRepository = (): jest.Mocked<IReservationRepository> => ({
  createReservationsForOrder: jest.fn(),
  getActiveReservations: jest.fn(),
  fulfillReservations: jest.fn(),
  restoreReservations: jest.fn(),
  checkAvailability: jest.fn(),
  createReservationsWithTransaction: jest.fn(),
  fulfillReservationsWithTransaction: jest.fn(),
  restoreReservationsWithTransaction: jest.fn(),
});

export const createMockOrderWorkflowRepository = (): jest.Mocked<IOrderWorkflowRepository> => ({
  createStatusHistory: jest.fn(),
  createOrderTransactionLink: jest.fn(),
  createStatusHistoryWithTransaction: jest.fn(),
  createOrderTransactionLinkWithTransaction: jest.fn(),
});