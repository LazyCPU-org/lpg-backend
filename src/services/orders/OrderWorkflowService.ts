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
import { IInventoryReservationService } from "../inventory/reservations/IInventoryReservationService";
import { IOrderWorkflowService } from "./IOrderWorkflowService";

export class OrderWorkflowService implements IOrderWorkflowService {
  constructor(
    private orderRepository: IOrderRepository,
    private workflowRepository: IOrderWorkflowRepository,
    private reservationService: IInventoryReservationService
  ) {}

  async confirmOrder(orderId: number, assignmentId: number, userId: number): Promise<any> {
    const detailed = await this.confirmOrderDetailed(orderId, assignmentId, userId);
    return detailed;
  }

  async confirmOrderDetailed(
    orderId: number,
    assignmentId: number,
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
        throw new NotFoundError(`Pedido ${orderId} no encontrado`);
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
          validation.error || "Transición de estado inválida"
        );
      }

      // Assign order to store and reserve inventory atomically
      await this.orderRepository.assignOrderToStore(orderId, assignmentId, trx);
      
      // Get order with items for inventory reservation
      const orderWithItems = await this.orderRepository.findByIdWithRelations(orderId, {
        items: true,
      });
      
      if (orderWithItems?.orderItems && orderWithItems.orderItems.length > 0) {
        const items = orderWithItems.orderItems.map((item) => ({
          itemType: item.itemType as "tank" | "item",
          itemId: item.tankTypeId || item.inventoryItemId || 0,
          quantity: item.quantity,
        }));

        // Create inventory reservations
        await this.reservationService.createReservation(
          orderId,
          assignmentId, // Store assignment ID contains the store information
          items,
          userId
        );
      }

      // Perform the status transition
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        "Pedido confirmado, tienda asignada, inventario reservado",
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

  // reserveInventory methods removed - now handled in confirmOrder

  async startDelivery(orderId: number, deliveryUserId: number): Promise<any> {
    const detailed = await this.startDeliveryDetailed(orderId, deliveryUserId);
    return detailed;
  }

  async startDeliveryDetailed(
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
        throw new NotFoundError(`Pedido ${orderId} no encontrado`);
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
          validation.error || "Transición de estado inválida"
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        deliveryUserId,
        "Entrega iniciada",
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

  async completeDelivery(orderId: number, deliveryUserId: number): Promise<any> {
    const detailed = await this.completeDeliveryDetailed(orderId, deliveryUserId);
    return detailed;
  }

  async completeDeliveryDetailed(
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
        throw new NotFoundError(`Pedido ${orderId} no encontrado`);
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
          validation.error || "Transición de estado inválida"
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
        "Entrega completada exitosamente",
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

  async failDelivery(orderId: number, reason: string): Promise<any> {
    const detailed = await this.failDeliveryDetailed(orderId, reason, 1, false); // Default values
    return detailed;
  }

  async failDeliveryDetailed(
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
        throw new NotFoundError(`Pedido ${orderId} no encontrado`);
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
          validation.error || "Transición de estado inválida"
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        `Entrega fallida: ${reason}`,
        reschedule ? "Se reprogramará" : "Requiere intervención manual"
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  async cancelOrder(orderId: number, reason: string, userId: number): Promise<any> {
    const detailed = await this.cancelOrderDetailed(orderId, reason, userId);
    return detailed;
  }

  async cancelOrderDetailed(
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
        throw new NotFoundError(`Pedido ${orderId} no encontrado`);
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
          validation.error || "Transición de estado inválida"
        );
      }

      // Restore any reserved inventory
      if (["confirmed", "in_transit"].includes(fromStatus)) {
        await this.reservationService.restoreReservation(
          orderId,
          `Pedido cancelado: ${reason}`,
          userId
        );
      }

      // Update order status
      const result = await this.workflowRepository.performStatusTransition(
        orderId,
        fromStatus,
        toStatus,
        userId,
        `Pedido cancelado: ${reason}`
      );

      return {
        order: result.order,
        fromStatus,
        toStatus,
        historyEntry: result.historyEntry,
      };
    });
  }

  validateTransition(fromStatus: string, toStatus: string): boolean {
    // Simplified workflow validation - RESERVED status removed
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["in_transit", "cancelled"], // Direct transition to delivery
      in_transit: ["delivered", "failed", "cancelled"],
      delivered: ["fulfilled", "failed"],
      failed: ["confirmed", "in_transit", "cancelled"], // Can restore or retry
      fulfilled: [], // Terminal state
      cancelled: [], // Terminal state
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  async validateTransitionDetailed(
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
            // Note: Bulk confirm requires assignmentId, which we don't have here
            throw new Error("Confirmación masiva requiere asignaciones individuales de tienda");
          case "cancelled":
            await this.cancelOrder(orderId, reason, userId);
            break;
          default:
            throw new Error(`Transición masiva a ${toStatus} no soportada`);
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
      "pending->confirmed": "Confirmar pedido, asignar tienda y reservar inventario",
      "confirmed->in_transit": "Iniciar proceso de entrega",
      "in_transit->delivered": "Completar entrega y actualizar inventario",
      "delivered->fulfilled": "Generar factura y finalizar pedido",
      "any->cancelled": "Cancelar pedido y restaurar inventario",
      "in_transit->failed": "Marcar entrega como fallida",
      "failed->in_transit": "Reintentar entrega",
    };

    const key = `${fromStatus}->${toStatus}`;
    return (
      descriptions[key] ||
      descriptions[`any->${toStatus}`] ||
      `Transition to ${toStatus}`
    );
  }
}
