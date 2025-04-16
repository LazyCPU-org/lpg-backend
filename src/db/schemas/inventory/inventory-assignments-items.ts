import {
  pgTable,
  serial,
  integer,
  timestamp,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { inventoryAssignments } from "./inventory-assignments";
import inventoryItem from "./inventory-item";

/**
 * Defines the items associated with an inventory assignment
 * Unlike the assignment_tanks table, this table will be related to any other items different than tanks
 */
export const assignmentItems = pgTable("assignment_items", {
  assignentItemId: serial("assignment_item_id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => inventoryAssignments.inventoryId),
  inventoryItemId: integer("inventory_item_id")
    .notNull()
    .references(() => inventoryItem.inventoryItemId),
  purchase_price: decimal("purchase_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  assignedItems: integer("assigned_items").notNull().default(0),
  currentItems: integer("current_items").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertInventoryItemSchema = createInsertSchema(assignmentItems);
export const selectInventoryItemSchema = createSelectSchema(assignmentItems);

export type InventoryItem = z.infer<typeof selectInventoryItemSchema>;
export type NewInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export default assignmentItems;
