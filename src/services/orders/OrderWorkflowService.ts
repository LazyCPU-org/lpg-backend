import { db } from "../../db";
import { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type {
  OrderStatusHistoryType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import { IOrderRepository } from "../../repositories/orders/IOrderRepository";
import { IOrderWorkflowRepository } from "../../repositories/orders/IOrderWorkflowRepository";
import { TimelineItem } from "../../repositories/orders/orderTypes";
import { BadRequestError, NotFoundError } from "../../utils/custom-errors";
import { IInventoryReservationService } from "./IInventoryReservationService";
import { IOrderWorkflowService } from "./IOrderWorkflowService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderWorkflowService implements IOrderWorkflowService {
  constructor(
    private orderRepository: IOrderRepository,
    private workflowRepository: IOrderWorkflowRepository,
    private reservationService: IInventoryReservationService
  ) {}

  async confirmOrder(
    orderId: number,
    userId: number,
    notes?: string
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      // Get current order status
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.CONFIRMED;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Perform the status transition
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        "Order confirmed by operator",
        notes
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async reserveInventory(
    orderId: number,
    userId: number
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      // Get current order
      const order = await this.orderRepository.findByIdWithRelations(orderId, {
        items: true,
      });
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.RESERVED;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Create inventory reservations
      if (order.orderItems && order.orderItems.length > 0) {
        const items = order.orderItems.map((item) => ({
          itemType: item.itemType as "tank" | "item",
          itemId: item.tankTypeId || item.inventoryItemId || 0,
          quantity: item.quantity,
        }));

        await this.reservationService.createReservation(
          orderId,
          order.storeId,
          items,
          userId
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        "Inventory reserved for order"
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async startDelivery(
    orderId: number,
    deliveryUserId: number,
    specialInstructions?: string
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.IN_TRANSIT;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        deliveryUserId,
        "Delivery started",
        specialInstructions
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async completeDelivery(
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
  }> {
    return await db.transaction(async (trx) => {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.DELIVERED;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Fulfill inventory reservations
      await this.reservationService.fulfillReservation(
        orderId,
        deliveryUserId,
        actualItems,
        customerSignature,
        deliveryNotes
      );

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        deliveryUserId,
        "Delivery completed successfully",
        deliveryNotes
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async failDelivery(
    orderId: number,
    reason: string,
    userId: number,
    reschedule?: boolean
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.FAILED;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        `Delivery failed: ${reason}`,
        reschedule ? "Will be rescheduled" : "Manual intervention required"
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async cancelOrder(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<{
    order: OrderWithDetails;
    fromStatus: OrderStatusEnum;
    toStatus: OrderStatusEnum;
    historyEntry: OrderStatusHistoryType;
  }> {
    return await db.transaction(async (trx) => {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      const fromStatus = order.status as OrderStatusEnum;
      const toStatus: OrderStatusEnum = OrderStatusEnum.CANCELLED;

      // Validate transition
      const validation = this.workflowRepository.validateStatusTransition(
        fromStatus,
        toStatus
      );
      if (!validation.valid) {
        throw new BadRequestError(
          validation.error || "Invalid status transition"
        );
      }

      // Restore any reserved inventory
      if (["reserved", "in_transit"].includes(fromStatus)) {
        await this.reservationService.restoreReservation(
          orderId,
          `Order cancelled: ${reason}`,
          userId
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        `Order cancelled: ${reason}`
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async validateTransition(
    orderId: number,
    toStatus: OrderStatusEnum,
    userId: number
  ): Promise<{
    canTransition: boolean;
    reason?: string;
  }> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return {
        canTransition: false,
        reason: "Order not found",
      };
    }

    const fromStatus = order.status as OrderStatusEnum;
    const validation = this.workflowRepository.validateStatusTransition(
      fromStatus,
      toStatus
    );

    if (!validation.valid) {
      return {
        canTransition: false,
        reason: validation.error,
      };
    }

    return {
      canTransition: true,
    };
  }

  async canUserPerformTransition(
    userId: number,
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): Promise<boolean> {
    // Simplified implementation - would check user permissions
    return true;
  }

  async getAvailableTransitions(
    orderId: number,
    userId: number
  ): Promise<
    Array<{
      toStatus: OrderStatusEnum;
      description: string;
      requiresConfirmation: boolean;
    }>
  > {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return [];
    }

    const fromStatus = order.status as OrderStatusEnum;
    const allowedTransitions =
      this.workflowRepository.getAllowedTransitions(fromStatus);

    return allowedTransitions.map((status) => ({
      toStatus: status,
      description: this.getTransitionDescription(fromStatus, status),
      requiresConfirmation: ["cancelled", "failed"].includes(status),
    }));
  }

  async getOrderWorkflowHistory(orderId: number): Promise<TimelineItem[]> {
    const timeline = await this.workflowRepository.getOrderTimeline(orderId);
    return timeline;
  }

  async bulkTransition(
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
  }> {
    const successful: number[] = [];
    const failed: Array<{ orderId: number; error: string }> = [];

    for (const orderId of orderIds) {
      try {
        switch (toStatus) {
          case "confirmed":
            await this.confirmOrder(orderId, userId);
            break;
          case "cancelled":
            await this.cancelOrder(orderId, reason, userId);
            break;
          default:
            throw new Error(`Bulk transition to ${toStatus} not supported`);
        }

        successful.push(orderId);
      } catch (error) {
        failed.push({
          orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  async getWorkflowMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalOrders: number;
    averageProcessingTime: number;
    deliverySuccessRate: number;
    cancellationRate: number;
  }> {
    const dateRange =
      fromDate && toDate ? { from: fromDate, to: toDate } : undefined;
    const metrics = await this.workflowRepository.getWorkflowMetrics(
      storeId,
      dateRange
    );

    return {
      totalOrders: metrics.totalOrders,
      averageProcessingTime: metrics.averageProcessingTime,
      deliverySuccessRate: metrics.deliverySuccessRate,
      cancellationRate: metrics.cancellationRate,
    };
  }

  // Helper methods
  private getTransitionDescription(
    fromStatus: OrderStatusEnum,
    toStatus: OrderStatusEnum
  ): string {
    const descriptions: Record<string, string> = {
      "pending->confirmed": "Confirm order details and availability",
      "confirmed->reserved": "Reserve inventory for this order",
      "reserved->in_transit": "Start delivery process",
      "in_transit->delivered": "Complete delivery and update inventory",
      "delivered->fulfilled": "Generate invoice and finalize order",
      "any->cancelled": "Cancel order and restore inventory",
      "in_transit->failed": "Mark delivery as failed",
      "failed->in_transit": "Retry delivery",
    };

    const key = `${fromStatus}->${toStatus}`;
    return (
      descriptions[key] ||
      descriptions[`any->${toStatus}`] ||
      `Transition to ${toStatus}`
    );
  }
}
