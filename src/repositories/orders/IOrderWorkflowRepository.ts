import type { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type {
  OrderStatusHistoryType,
  OrderStatusHistoryWithDetails,
  OrderType,
} from "../../dtos/response/orderInterface";
import { TimelineItem } from "./orderTypes";

// Transaction type for dependency injection (following inventory pattern)
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

// Workflow metrics interface
export interface WorkflowMetrics {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  averageProcessingTime: number; // Hours from pending to fulfilled
  statusTransitionCounts: Record<string, number>; // "pending->confirmed": count
  dailyOrderCreation: Array<{ date: string; count: number }>;
  deliverySuccessRate: number; // Percentage of delivered vs failed
  cancellationRate: number; // Percentage of cancelled orders
  topReasons: Array<{ reason: string; count: number }>; // Most common transition reasons
}

// Status transition validation result
export interface StatusTransitionResult {
  valid: boolean;
  error?: string;
  allowedTransitions?: OrderStatusEnum[];
}

export abstract class IOrderWorkflowRepository {
  // Status Management
  abstract updateOrderStatus(
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void>;

  abstract validateStatusTransition(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): StatusTransitionResult;

  abstract getAllowedTransitions(
    currentStatus: OrderStatusEnum
  ): OrderStatusEnum[];

  // Status History Management
  abstract createStatusHistory(
    orderId: number,
    fromStatus: OrderStatusEnum | null,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<OrderStatusHistoryType>;

  abstract getStatusHistory(
    orderId: number,
    includeUserDetails?: boolean
  ): Promise<OrderStatusHistoryWithDetails[]>;

  abstract getStatusHistoryForOrders(
    orderIds: number[],
    includeUserDetails?: boolean
  ): Promise<Record<number, OrderStatusHistoryWithDetails[]>>;

  // Transaction Support (for atomic workflow operations)
  abstract updateOrderStatusWithTransaction(
    trx: DbTransaction,
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void>;

  abstract createStatusHistoryWithTransaction(
    trx: DbTransaction,
    orderId: number,
    fromStatus: OrderStatusEnum | null,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<OrderStatusHistoryType>;

  // Complete workflow operations (status + history in one transaction)
  abstract performStatusTransition(
    orderId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<{
    order: OrderType;
    historyEntry: OrderStatusHistoryType;
  }>;

  // Business Intelligence and Analytics
  abstract getOrdersByStatus(
    status: OrderStatusEnum,
    storeId?: number,
    limit?: number,
    offset?: number
  ): Promise<OrderType[]>;

  abstract getWorkflowMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<WorkflowMetrics>;

  abstract getStatusTransitionMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    transitionCounts: Record<string, number>;
    averageTimeInStatus: Record<string, number>; // Hours
    bottlenecks: Array<{
      status: string;
      averageTime: number;
      orderCount: number;
    }>;
  }>;

  // Order lifecycle tracking
  abstract getOrderTimeline(orderId: number): Promise<TimelineItem[]>;

  abstract getOrdersStuckInStatus(
    status: OrderStatusEnum,
    thresholdHours?: number,
    storeId?: number
  ): Promise<
    Array<{
      orderId: number;
      orderNumber: string;
      customerName: string;
      hoursInStatus: number;
      lastUpdate: Date;
    }>
  >;

  // Workflow automation support
  abstract getOrdersReadyForTransition(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    storeId?: number
  ): Promise<OrderType[]>;

  abstract bulkStatusTransition(
    orderIds: number[],
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }>;

  // Status validation and business rules
  abstract getOrderCurrentStatus(
    orderId: number
  ): Promise<OrderStatusEnum | null>;

  abstract canTransitionStatus(
    orderId: number,
    toStatus: OrderStatusEnum
  ): Promise<StatusTransitionResult>;

  abstract getOrdersRequiringAttention(storeId?: number): Promise<
    Array<{
      orderId: number;
      orderNumber: string;
      status: OrderStatusEnum;
      issue: string;
      priority: "low" | "medium" | "high";
      lastUpdate: Date;
    }>
  >;

  // Reporting and analytics
  abstract generateWorkflowReport(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    summary: WorkflowMetrics;
    dailyBreakdown: Array<{
      date: string;
      created: number;
      completed: number;
      cancelled: number;
      pendingAtEndOfDay: number;
    }>;
    performanceMetrics: {
      averageOrderFulfillmentTime: number; // Hours
      peakHours: Array<{ hour: number; orderCount: number }>;
      slowestOrders: Array<{
        orderId: number;
        orderNumber: string;
        totalTime: number;
        currentStatus: OrderStatusEnum;
      }>;
    };
  }>;

  // Utility methods
  abstract getWorkflowConfiguration(): Promise<{
    allowedTransitions: Record<OrderStatusEnum, OrderStatusEnum[]>;
    statusDescriptions: Record<OrderStatusEnum, string>;
    requiredPermissions: Record<string, string[]>; // "pending->confirmed": ["operator", "admin"]
  }>;

  abstract isValidTransitionReason(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum,
    reason: string
  ): boolean;

  abstract getSuggestedReasons(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): string[];
}
