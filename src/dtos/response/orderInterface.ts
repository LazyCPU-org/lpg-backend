import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  orders,
  orderItems,
  inventoryReservations,
  orderTransactionLinks,
  orderStatusHistory,
  orderDeliveries,
  ItemTypeEnum,
  DeliveryStatusEnum,
  ReservationStatusEnum,
} from "../../db/schemas/orders";
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import { customers } from "../../db/schemas/customers/customers";
import { stores } from "../../db/schemas/locations/stores";
import { TankType, InventoryItem } from "./inventoryInterface";
import { users } from "../../db/schemas/user-management/users";

// Type aliases for cleaner interface definitions
type Customer = typeof customers.$inferSelect;
type Store = typeof stores.$inferSelect;
type User = typeof users.$inferSelect;

/**
 * @openapi
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         orderId:
 *           type: integer
 *           description: The auto-generated order ID
 *         orderNumber:
 *           type: string
 *           description: Human-readable order number (e.g., ORD-2024-001)
 *         customerId:
 *           type: integer
 *           description: Reference to customer (optional for quick orders)
 *         customerName:
 *           type: string
 *           description: Customer name for quick orders
 *         customerPhone:
 *           type: string
 *           description: Customer phone for quick orders
 *         storeId:
 *           type: integer
 *           description: Reference to store fulfilling the order
 *         deliveryAddress:
 *           type: string
 *           description: Address where order should be delivered
 *         locationReference:
 *           type: string
 *           description: Additional location reference
 *         status:
 *           type: string
 *           enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
 *           description: Current order status
 *         priority:
 *           type: integer
 *           description: Order priority (1 = highest, 5 = lowest)
 *         paymentMethod:
 *           type: string
 *           enum: [cash, yape, plin, transfer]
 *           description: Payment method
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, debt]
 *           description: Payment status
 *         totalAmount:
 *           type: string
 *           format: decimal
 *           description: Total order amount
 *         createdBy:
 *           type: integer
 *           description: User who created the order
 *         deliveredBy:
 *           type: integer
 *           description: User who delivered the order
 *         deliveryDate:
 *           type: string
 *           format: date-time
 *           description: When the order was delivered
 *         notes:
 *           type: string
 *           description: Additional order notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export const InsertOrderSchema = createInsertSchema(orders);
export const SelectOrderSchema = createSelectSchema(orders);

export type OrderType = z.infer<typeof SelectOrderSchema>;
export type NewOrderType = z.infer<typeof InsertOrderSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderItem:
 *       type: object
 *       properties:
 *         itemId:
 *           type: integer
 *           description: The auto-generated item ID
 *         orderId:
 *           type: integer
 *           description: Reference to order
 *         itemType:
 *           type: string
 *           enum: [tank, item]
 *           description: Type of item ordered
 *         tankTypeId:
 *           type: integer
 *           description: Reference to tank type (if itemType is 'tank')
 *         inventoryItemId:
 *           type: integer
 *           description: Reference to inventory item (if itemType is 'item')
 *         quantity:
 *           type: integer
 *           description: Quantity ordered
 *         tankReturned:
 *           type: boolean
 *           description: Whether empty tank was returned (for tank orders)
 *         unitPrice:
 *           type: string
 *           format: decimal
 *           description: Price per unit
 *         totalPrice:
 *           type: string
 *           format: decimal
 *           description: Total price for this item
 *         deliveryStatus:
 *           type: string
 *           enum: [pending, delivered, cancelled]
 *           description: Delivery status of this item
 *         deliveredBy:
 *           type: integer
 *           description: User who delivered this item
 */
export const InsertOrderItemSchema = createInsertSchema(orderItems);
export const SelectOrderItemSchema = createSelectSchema(orderItems);

export type OrderItemType = z.infer<typeof SelectOrderItemSchema>;
export type NewOrderItemType = z.infer<typeof InsertOrderItemSchema>;

// Order item with details
export interface OrderItemWithDetails extends OrderItemType {
  tankType?: TankType;
  inventoryItem?: InventoryItem;
  deliveredByUser?: User;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     InventoryReservation:
 *       type: object
 *       properties:
 *         reservationId:
 *           type: integer
 *           description: The auto-generated reservation ID
 *         orderId:
 *           type: integer
 *           description: Reference to order
 *         assignmentId:
 *           type: integer
 *           description: Reference to store assignment
 *         currentInventoryId:
 *           type: integer
 *           description: Reference to current active inventory
 *         itemType:
 *           type: string
 *           enum: [tank, item]
 *           description: Type of item reserved
 *         tankTypeId:
 *           type: integer
 *           description: Reference to tank type (if itemType is 'tank')
 *         inventoryItemId:
 *           type: integer
 *           description: Reference to inventory item (if itemType is 'item')
 *         reservedQuantity:
 *           type: integer
 *           description: Quantity reserved
 *         status:
 *           type: string
 *           enum: [active, fulfilled, cancelled, expired]
 *           description: Reservation status
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When the reservation expires (optional)
 */
export const InsertInventoryReservationSchema = createInsertSchema(inventoryReservations);
export const SelectInventoryReservationSchema = createSelectSchema(inventoryReservations);

export type InventoryReservationType = z.infer<typeof SelectInventoryReservationSchema>;
export type NewInventoryReservationType = z.infer<typeof InsertInventoryReservationSchema>;

// Reservation with details
export interface InventoryReservationWithDetails extends InventoryReservationType {
  tankType?: TankType;
  inventoryItem?: InventoryItem;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderTransactionLink:
 *       type: object
 *       properties:
 *         linkId:
 *           type: integer
 *           description: The auto-generated link ID
 *         orderId:
 *           type: integer
 *           description: Reference to order
 *         tankTransactionId:
 *           type: integer
 *           description: Reference to tank transaction (if applicable)
 *         itemTransactionId:
 *           type: integer
 *           description: Reference to item transaction (if applicable)
 *         deliveryId:
 *           type: integer
 *           description: Reference to delivery (if applicable)
 *         createdAt:
 *           type: string
 *           format: date-time
 */
export const InsertOrderTransactionLinkSchema = createInsertSchema(orderTransactionLinks);
export const SelectOrderTransactionLinkSchema = createSelectSchema(orderTransactionLinks);

export type OrderTransactionLinkType = z.infer<typeof SelectOrderTransactionLinkSchema>;
export type NewOrderTransactionLinkType = z.infer<typeof InsertOrderTransactionLinkSchema>;

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderStatusHistory:
 *       type: object
 *       properties:
 *         historyId:
 *           type: integer
 *           description: The auto-generated history ID
 *         orderId:
 *           type: integer
 *           description: Reference to order
 *         fromStatus:
 *           type: string
 *           enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
 *           description: Previous status (null for initial creation)
 *         toStatus:
 *           type: string
 *           enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
 *           description: New status
 *         changedBy:
 *           type: integer
 *           description: User who made the change
 *         reason:
 *           type: string
 *           description: Reason for the status change
 *         notes:
 *           type: string
 *           description: Additional notes about the change
 *         createdAt:
 *           type: string
 *           format: date-time
 */
export const InsertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory);
export const SelectOrderStatusHistorySchema = createSelectSchema(orderStatusHistory);

export type OrderStatusHistoryType = z.infer<typeof SelectOrderStatusHistorySchema>;
export type NewOrderStatusHistoryType = z.infer<typeof InsertOrderStatusHistorySchema>;

// Status history with user details
export interface OrderStatusHistoryWithDetails extends OrderStatusHistoryType {
  changedByUser?: User;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderDelivery:
 *       type: object
 *       properties:
 *         deliveryId:
 *           type: integer
 *           description: The auto-generated delivery ID
 *         orderId:
 *           type: integer
 *           description: Reference to order
 *         deliveryUserId:
 *           type: integer
 *           description: User assigned to deliver this order
 *         deliveryDate:
 *           type: string
 *           format: date
 *           description: Scheduled delivery date
 *         deliveryNotes:
 *           type: string
 *           description: Notes about the delivery
 *         status:
 *           type: string
 *           enum: [scheduled, in_transit, delivered, failed, cancelled]
 *           description: Delivery status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export const InsertOrderDeliverySchema = createInsertSchema(orderDeliveries);
export const SelectOrderDeliverySchema = createSelectSchema(orderDeliveries);

export type OrderDeliveryType = z.infer<typeof SelectOrderDeliverySchema>;
export type NewOrderDeliveryType = z.infer<typeof InsertOrderDeliverySchema>;

// Delivery with user details
export interface OrderDeliveryWithDetails extends OrderDeliveryType {
  deliveryUser?: User;
}

// Availability check result
export interface AvailabilityItem {
  itemType: 'tank' | 'item';
  tankTypeId?: number;
  inventoryItemId?: number;
  requested: number;
  available: number;
  reserved: number;
  current: number;
}

export interface AvailabilityResult {
  available: boolean;
  details: AvailabilityItem[];
}

// Comprehensive order interface with all relations
export interface OrderWithDetails extends OrderType {
  customer?: Customer;
  assignation?: any; // Store assignment with store and user info
  createdByUser?: User;
  orderItems?: OrderItemWithDetails[];
  reservations?: InventoryReservationWithDetails[];
  transactionLinks?: OrderTransactionLinkType[];
  deliveries?: OrderDeliveryWithDetails[];
  statusHistory?: OrderStatusHistoryWithDetails[];
  invoice?: any; // Will be defined when invoice interface is created
}

// Relation options for orders
export interface OrderRelationOptions {
  items?: boolean;
  reservations?: boolean;
  transactions?: boolean;
  deliveries?: boolean;
  customer?: boolean;
  assignation?: boolean; // Changed from 'store' to 'assignation' for store assignment
  invoice?: boolean;
}

// Order workflow transition result
export interface OrderTransition {
  order: OrderWithDetails;
  statusChange: OrderStatusHistoryType;
  transactions?: OrderTransactionLinkType[];
  reservations?: InventoryReservationType[];
}

// Order operation results
export interface ReservationResult {
  success: boolean;
  reservations: InventoryReservationType[];
  message?: string;
}

export interface FulfillmentResult {
  success: boolean;
  transactions: OrderTransactionLinkType[];
  message?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredReservations: InventoryReservationType[];
  message?: string;
}