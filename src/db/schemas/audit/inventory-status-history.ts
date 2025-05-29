import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { inventoryAssignments, inventoryStatusEnum } from "../inventory";
import { users } from "../user-management/users";

/**
 * Tracks the complete history of status changes for inventory assignments
 * Provides audit trail for compliance and operational analysis
 */
export const inventoryStatusHistory = pgTable("inventory_status_history", {
  historyId: serial("history_id").primaryKey(),
  inventoryId: integer("inventory_id")
    .notNull()
    .references(() => inventoryAssignments.inventoryId),
  fromStatus: inventoryStatusEnum("from_status"), // null for initial creation
  toStatus: inventoryStatusEnum("to_status").notNull(),
  changedBy: integer("changed_by")
    .notNull()
    .references(() => users.userId),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  reason: text("reason"), // Optional: system or manual reason for change
  notes: text("notes"), // Additional context from user
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const inventoryStatusHistoryRelations = relations(
  inventoryStatusHistory,
  ({ one }) => ({
    inventoryAssignment: one(inventoryAssignments, {
      fields: [inventoryStatusHistory.inventoryId],
      references: [inventoryAssignments.inventoryId],
    }),
    changedByUser: one(users, {
      fields: [inventoryStatusHistory.changedBy],
      references: [users.userId],
    }),
  })
);

export default inventoryStatusHistory;
