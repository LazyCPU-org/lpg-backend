/**
 * Mock Order Repository for Testing
 *
 * Provides mock implementations of order repositories to avoid database dependencies
 * during unit testing. Follows existing patterns from inventory transaction tests.
 */

import {
  NewOrderStatusHistoryType,
  NewOrderTransactionLinkType,
  NewOrderType,
  OrderRelationOptions,
  OrderStatusHistoryType,
  OrderTransactionLinkType,
  OrderType,
  OrderWithDetails,
} from "../../../../dtos/response/orderInterface";

import { GetOrdersRequest } from "../../../../dtos/request/orderDTO";

// Mock interfaces based on actual service structure (following inventory patterns)
export interface IOrderRepository {
  createOrder(orderData: NewOrderType): Promise<OrderType>;
  getOrderById(
    orderId: number,
    include?: OrderRelationOptions
  ): Promise<OrderWithDetails | null>;
  updateOrderStatus(
    orderId: number,
    status: string,
    userId: number
  ): Promise<OrderType>;
  getOrdersByFilters(filters: GetOrdersRequest): Promise<OrderWithDetails[]>;
  cancelOrder(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<OrderType>;
  // Transaction-aware methods
  createOrderWithTransaction(
    orderData: NewOrderType,
    trx: any
  ): Promise<OrderType>;
  updateOrderStatusWithTransaction(
    orderId: number,
    status: string,
    userId: number,
    trx: any
  ): Promise<OrderType>;
}

export interface IOrderWorkflowRepository {
  createStatusHistory(
    historyData: NewOrderStatusHistoryType
  ): Promise<OrderStatusHistoryType>;
  createOrderTransactionLink(
    linkData: NewOrderTransactionLinkType
  ): Promise<OrderTransactionLinkType>;
  // Transaction-aware methods
  createStatusHistoryWithTransaction(
    historyData: NewOrderStatusHistoryType,
    trx: any
  ): Promise<OrderStatusHistoryType>;
  createOrderTransactionLinkWithTransaction(
    linkData: NewOrderTransactionLinkType,
    trx: any
  ): Promise<OrderTransactionLinkType>;
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

export const createMockOrderWorkflowRepository =
  (): jest.Mocked<IOrderWorkflowRepository> => ({
    createStatusHistory: jest.fn(),
    createOrderTransactionLink: jest.fn(),
    createStatusHistoryWithTransaction: jest.fn(),
    createOrderTransactionLinkWithTransaction: jest.fn(),
  });
