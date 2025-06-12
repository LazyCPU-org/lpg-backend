import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../user-management/users";
import { orders } from "./orders";
import { orderStatusEnum } from "./order-status-types";

export const orderStatusHistory = pgTable("order_status_history", {
  historyId: serial("history_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.orderId),
  fromStatus: orderStatusEnum(),
  toStatus: orderStatusEnum().notNull(),
  changedBy: integer("changed_by")
    .notNull()
    .references(() => users.userId),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const orderStatusHistoryRelations = relations(
  orderStatusHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusHistory.orderId],
      references: [orders.orderId],
    }),
    changedByUser: one(users, {
      fields: [orderStatusHistory.changedBy],
      references: [users.userId],
    }),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default orderStatusHistory;
