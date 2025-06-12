import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  text,
  date,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { users } from "../user-management/users";

// Define delivery status enum values
export const DeliveryStatusEnum = {
  SCHEDULED: "scheduled",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// Define enum values restriction in database
export const deliveryStatusEnum = pgEnum("order_delivery_status_enum", [
  DeliveryStatusEnum.SCHEDULED,
  DeliveryStatusEnum.IN_TRANSIT,
  DeliveryStatusEnum.DELIVERED,
  DeliveryStatusEnum.FAILED,
  DeliveryStatusEnum.CANCELLED,
]);

export const orderDeliveries = pgTable("order_deliveries", {
  deliveryId: serial("delivery_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.orderId),
  deliveryUserId: integer("delivery_user_id")
    .notNull()
    .references(() => users.userId),
  deliveryDate: date("delivery_date", { mode: "string" }),
  deliveryNotes: text("delivery_notes"),
  status: deliveryStatusEnum().default(DeliveryStatusEnum.SCHEDULED),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const orderDeliveriesRelations = relations(
  orderDeliveries,
  ({ one, many }) => ({
    order: one(orders, {
      fields: [orderDeliveries.orderId],
      references: [orders.orderId],
    }),
    deliveryUser: one(users, {
      fields: [orderDeliveries.deliveryUserId],
      references: [users.userId],
    }),
    transactionLinks: many(orderTransactionLinks),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default orderDeliveries;

// Import after relations to avoid circular dependency
import { orderTransactionLinks } from "./order-transaction-links";