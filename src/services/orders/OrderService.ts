import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orders } from "../../db/schemas/orders";
import {
  PaymentStatusEnum,
  type OrderStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import type { CreateOrderRequest } from "../../dtos/request/orderDTO";
import type {
  OrderType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";
import { ICustomerRepository } from "../../repositories/customers/ICustomerRepository";
import { IOrderRepository } from "../../repositories/orders/IOrderRepository";
import { BadRequestError, NotFoundError } from "../../utils/custom-errors";
import { IInventoryReservationService } from "../inventory/reservations/IInventoryReservationService";
import { IOrderService } from "./IOrderService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderService implements IOrderService {
  constructor(
    private orderRepository: IOrderRepository,
    private customerRepository: ICustomerRepository,
    private reservationService: IInventoryReservationService
  ) {}

  async createOrder(
    orderData: CreateOrderRequest,
    createdBy: number
  ): Promise<OrderWithDetails> {
    return await db.transaction(async (trx) => {
      // Get customer data from repository
      const customer = await this.customerRepository.findById(
        orderData.customerId
      );
      if (!customer) {
        throw new NotFoundError(
          `Cliente con ID ${orderData.customerId} no encontrado`
        );
      }

      // Create the order (starts as PENDING without store assignment)
      const order = await this.orderRepository.createWithTransaction(
        trx,
        `${customer.firstName} ${customer.lastName}`.trim(),
        customer.phoneNumber,
        customer.address,
        orderData.paymentMethod,
        PaymentStatusEnum.PENDING, // Always start with pending payment
        createdBy,
        customer.customerId,
        customer.locationReference ?? "",
        1, // For now all of them have the same priority
        orderData.notes
      );

      // Create order items from the request
      await this.orderRepository.createOrderItemsWithTransaction(
        trx,
        order.orderId,
        orderData.items
      );

      // Calculate total amount from items
      const totalAmount = this.calculateOrderTotal(orderData.items);

      // Update order with calculated total
      await trx
        .update(orders)
        .set({
          totalAmount,
          updatedAt: new Date(),
        })
        .where(eq(orders.orderId, order.orderId));

      // Return order with items included
      return await this.orderRepository.findByIdWithRelations(order.orderId, {
        customer: true,
        assignation: true,
        items: true,
      });
    });
  }

  async getOrder(
    orderId: number,
    includeItems?: boolean,
    includeCustomer?: boolean,
    includeHistory?: boolean
  ): Promise<OrderWithDetails | null> {
    const includeOptions = {
      items: includeItems || false,
      customer: includeCustomer || false,
      store: false,
      statusHistory: includeHistory || false,
    };

    return await this.orderRepository.findByIdWithRelations(
      orderId,
      includeOptions
    );
  }

  async updateOrder(
    orderId: number,
    customerName?: string,
    customerPhone?: string,
    deliveryAddress?: string,
    notes?: string,
    userId?: number
  ): Promise<OrderWithDetails> {
    const existingOrder = await this.orderRepository.findById(orderId);
    if (!existingOrder) {
      throw new NotFoundError(`Pedido con ID ${orderId} no encontrado`);
    }

    const updates: Partial<OrderType> = {};
    if (customerName !== undefined) updates.customerName = customerName;
    if (customerPhone !== undefined) updates.customerPhone = customerPhone;
    if (deliveryAddress !== undefined)
      updates.deliveryAddress = deliveryAddress;
    if (notes !== undefined) updates.notes = notes;
    // Note: updatedBy is not part of OrderType interface

    await this.orderRepository.update(orderId, updates);
    return await this.orderRepository.findByIdWithRelations(orderId);
  }

  async deleteOrder(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Pedido con ID ${orderId} no encontrado`);
    }

    // Solo permitir eliminación de pedidos pendientes
    if (order.status !== "pending") {
      throw new BadRequestError("Solo se pueden eliminar pedidos pendientes");
    }

    await this.orderRepository.delete(orderId);
  }

  async validateOrderRequest(
    request: CreateOrderRequest
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validación del cliente
    if (!request.customerId) {
      errors.push("ID del cliente es requerido");
    } else {
      // Verificar que el cliente existe
      const customer = await this.customerRepository.findById(
        request.customerId
      );
      if (!customer) {
        errors.push(`Cliente con ID ${request.customerId} no encontrado`);
      }
    }

    // Validación de items
    if (!request.items || request.items.length === 0) {
      errors.push("El pedido debe contener al menos un artículo");
    }

    return { valid: errors.length === 0, errors };
  }

  async validateStoreAvailability(storeId: number): Promise<boolean> {
    // Simple implementation - could be enhanced with business rules
    return storeId > 0;
  }

  calculateOrderTotal(
    items: Array<{
      itemType: "tank" | "item";
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      unitPrice: string;
    }>
  ): string {
    let subtotal = 0;

    for (const item of items) {
      const unitPrice = parseFloat(item.unitPrice);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
    }

    const total = subtotal;

    return total.toFixed(2);
  }

  generateOrderNumber(): string {
    // Simple order number generation
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `ORD-${dateStr}-${randomSuffix}`;
  }

  async calculateOrderTotalDetailed(
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
  }> {
    let subtotal = 0;

    for (const item of items) {
      const unitPrice = parseFloat(item.unitPrice);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
    }

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    };
  }

  async generateOrderNumberForStore(storeId: number): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `ORD-${storeId}-${dateStr}-${randomSuffix}`;
  }

  async findOrders(
    storeId?: number,
    customerId?: number,
    status?: OrderStatusEnum,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<OrderWithDetails[]> {
    return await this.orderRepository.findByFilters(
      storeId,
      customerId,
      status,
      startDate,
      endDate,
      limit,
      offset
    );
  }

  async findOrdersByCustomer(
    customerId: number,
    limit?: number
  ): Promise<OrderWithDetails[]> {
    return await this.orderRepository.findCustomerOrderHistory(
      customerId,
      limit
    );
  }

  async searchOrders(
    query: string,
    storeId?: number,
    status?: OrderStatusEnum
  ): Promise<OrderWithDetails[]> {
    return await this.orderRepository.search(query, storeId, status as string);
  }

  async getCustomerOrderHistory(
    phoneNumber: string,
    limit?: number
  ): Promise<OrderWithDetails[]> {
    // Find customer first
    const customer = await this.customerRepository.findByPhone(phoneNumber);
    if (!customer) {
      return [];
    }

    return await this.orderRepository.findCustomerOrderHistory(
      customer.customerId,
      limit
    );
  }

  async getOrderMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: string;
    totalRevenue: string;
  }> {
    const dateRange =
      fromDate && toDate ? { from: fromDate, to: toDate } : undefined;
    const metrics = await this.orderRepository.getOrderMetrics(
      storeId,
      dateRange
    );

    return {
      totalOrders: metrics.totalOrders,
      completedOrders: metrics.ordersByStatus["delivered"] || 0,
      cancelledOrders: metrics.ordersByStatus["cancelled"] || 0,
      averageOrderValue: metrics.averageOrderValue,
      totalRevenue: metrics.totalRevenue,
    };
  }

  async canModifyOrder(orderId: number): Promise<boolean> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return false;

    // Can modify if not delivered or cancelled
    return !["delivered", "cancelled", "fulfilled"].includes(
      order.status ?? ""
    );
  }

  async canCancelOrder(orderId: number): Promise<boolean> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return false;

    // Can cancel if not already delivered or cancelled
    return !["delivered", "cancelled", "fulfilled"].includes(
      order.status ?? ""
    );
  }
}
