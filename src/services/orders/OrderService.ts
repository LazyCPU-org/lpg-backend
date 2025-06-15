import { db } from "../../db";
import {
  PaymentMethodEnum,
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
import { IInventoryReservationService } from "./IInventoryReservationService";
import { IOrderService } from "./IOrderService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderService implements IOrderService {
  constructor(
    private orderRepository: IOrderRepository,
    private customerRepository: ICustomerRepository,
    private reservationService: IInventoryReservationService
  ) {}

  async createOrder(orderData: CreateOrderRequest): Promise<OrderWithDetails> {
    return await db.transaction(async (trx) => {
      // Create or get customer
      let customerId = orderData.customerId;
      if (!customerId && orderData.customerPhone) {
        const customer = await this.customerRepository.findByPhone(
          orderData.customerPhone
        );
        if (customer) {
          customerId = customer.customerId;
        } else {
          // Create new customer
          // Parse customer name into first and last name
          const nameParts = (orderData.customerName ?? "").trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";

          const newCustomer = await this.customerRepository.create(
            firstName,
            lastName,
            orderData.customerPhone,
            orderData.deliveryAddress,
            undefined, // alternativePhone
            orderData.locationReference,
            "regular", // customerType
            undefined // rating
          );
          customerId = newCustomer.customerId;
        }
      }

      // Create the order
      const order = await this.orderRepository.createWithTransaction(
        trx,
        orderData.storeId,
        orderData.customerName ?? "",
        orderData.customerPhone ?? "",
        orderData.deliveryAddress,
        orderData.paymentMethod,
        orderData.paymentStatus,
        1, // TODO: createdBy from context
        customerId,
        orderData.locationReference,
        orderData.priority,
        orderData.notes
      );

      return order;
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
      throw new NotFoundError(`Order with ID ${orderId} not found`);
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
      throw new NotFoundError(`Order with ID ${orderId} not found`);
    }

    // Only allow deletion of pending orders
    if (order.status !== "pending") {
      throw new BadRequestError("Only pending orders can be deleted");
    }

    await this.orderRepository.delete(orderId);
  }

  async calculateOrderTotal(
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

  async generateOrderNumber(storeId: number): Promise<string> {
    // Simple order number generation
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

  async createQuickOrder(
    phoneNumber: string,
    customerName: string,
    storeId: number,
    items: Array<{
      itemType: "tank" | "item";
      itemId: number;
      quantity: number;
    }>,
    userId: number
  ): Promise<{
    order: OrderWithDetails;
    customerCreated: boolean;
    warnings: string[];
  }> {
    return await db.transaction(async (trx) => {
      let customerCreated = false;
      const warnings: string[] = [];

      // Find or create customer
      let customerId: number;
      let customer = await this.customerRepository.findByPhone(phoneNumber);
      if (!customer) {
        // Parse customer name into first and last name
        const nameParts = customerName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const newCustomer = await this.customerRepository.create(
          firstName,
          lastName,
          phoneNumber,
          "Address pending", // address
          undefined, // alternativePhone
          undefined, // locationReference
          "regular", // customerType
          undefined // rating
        );
        customerId = newCustomer.customerId;
        customerCreated = true;
      } else {
        customerId = customer.customerId;
      }

      // Create order
      const order = await this.orderRepository.createWithTransaction(
        trx,
        storeId,
        customerName,
        phoneNumber,
        "Address pending",
        PaymentMethodEnum.CASH, // default payment method
        PaymentStatusEnum.PENDING, // default payment status
        userId,
        customerId,
        undefined, // locationReference
        undefined, // priority
        "Quick order created"
      );

      // Try to create reservations
      try {
        await this.reservationService.createReservation(
          order.orderId,
          storeId,
          items,
          userId
        );
      } catch (error) {
        warnings.push(
          `Could not reserve inventory: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      return {
        order,
        customerCreated,
        warnings,
      };
    });
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
