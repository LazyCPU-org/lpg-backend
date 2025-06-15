import type { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type {
  OrderStatusHistoryType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import { TimelineItem } from "../../repositories/orders/orderTypes";

/**
 * Order Workflow Service Interface
 *
 * Manages order status transitions and workflow operations
 * following simple parameter patterns from inventory services.
 */
export abstract class IOrderWorkflowService {
  // Core Status Transitions
  abstract confirmOrder(
    orderId: number,
    userId: number,
    notes?: string
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  abstract reserveInventory(
    orderId: number,
    userId: number
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  abstract startDelivery(
    orderId: number,
    deliveryUserId: number,
    specialInstructions?: string
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  abstract completeDelivery(
    orderId: number,
    deliveryUserId: number,
    customerSignature?: string,
    deliveryNotes?: string,
    actualItems?: Array<{
      itemType: "tank" | "item";
      itemId: number;
      deliveredQuantity: number;
    }>
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  abstract failDelivery(
    orderId: number,
    reason: string,
    userId: number,
    reschedule?: boolean
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  abstract cancelOrder(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }>;

  // Workflow Validation
  abstract validateTransition(
    orderId: number,
    toStatus: OrderStatusEnum,
    userId: number
  ): Promise<{
    canTransition: boolean;
    reason?: string;
  }>;

  abstract canUserPerformTransition(
    userId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): Promise<boolean>;

  abstract getAvailableTransitions(
    orderId: number,
    userId: number
  ): Promise<
    Array<{
      toStatus: OrderStatusEnum;
      description: string;
      requiresConfirmation: boolean;
    }>
  >;

  // Order History
  abstract getOrderWorkflowHistory(orderId: number): Promise<TimelineItem[]>;

  // Bulk Operations
  abstract bulkTransition(
    orderIds: number[],
    toStatus: OrderStatusEnum,
    reason: string,
    userId: number
  ): Promise<{
    successful: number[];
    failed: Array<{
      orderId: number;
      error: string;
    }>;
  }>;

  // Analytics
  abstract getWorkflowMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalOrders: number;
    averageProcessingTime: number;
    deliverySuccessRate: number;
    cancellationRate: number;
  }>;
}
