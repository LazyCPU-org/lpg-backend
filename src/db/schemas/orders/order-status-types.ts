import { pgEnum } from "drizzle-orm/pg-core";

// Define the order status enum values
export const OrderStatusEnum = {
  PENDING: "pending", // Order created by operator, awaiting confirmation
  CONFIRMED: "confirmed", // Order details verified, ready for inventory reservation
  RESERVED: "reserved", // Inventory successfully reserved for this order
  IN_TRANSIT: "in_transit", // Delivery user has started the delivery process
  DELIVERED: "delivered", // Physical delivery completed, inventory transactions created
  FULFILLED: "fulfilled", // Invoice generated (optional), order complete
  CANCELLED: "cancelled", // Order cancelled, inventory reservations restored
  FAILED: "failed", // Delivery failed, requires attention and inventory restoration
} as const;

// Define enum values restriction in database
export const orderStatusEnum = pgEnum("order_status_enum", [
  OrderStatusEnum.PENDING,
  OrderStatusEnum.CONFIRMED,
  OrderStatusEnum.RESERVED,
  OrderStatusEnum.IN_TRANSIT,
  OrderStatusEnum.DELIVERED,
  OrderStatusEnum.FULFILLED,
  OrderStatusEnum.CANCELLED,
  OrderStatusEnum.FAILED,
]);

// Define payment method enum values
export const PaymentMethodEnum = {
  CASH: "cash",
  YAPE: "yape",
  PLIN: "plin",
  TRANSFER: "transfer",
} as const;

// Define payment status enum values
export const PaymentStatusEnum = {
  PENDING: "pending",
  PAID: "paid",
  DEBT: "debt",
} as const;

// Clean type aliases for easier usage
export type OrderStatus = typeof OrderStatusEnum[keyof typeof OrderStatusEnum];
export type PaymentMethod = typeof PaymentMethodEnum[keyof typeof PaymentMethodEnum];
export type PaymentStatus = typeof PaymentStatusEnum[keyof typeof PaymentStatusEnum];