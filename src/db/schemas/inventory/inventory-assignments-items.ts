import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventoryAssignments } from "./inventory-assignments";
import inventoryItem from "./inventory-item";

/**
 * Defines the items associated with an inventory assignment
 * Unlike the assignment_tanks table, this table will be related to any other items different than tanks
 */
export const assignmentItems = pgTable("assignment_items", {
  assignmentItemId: serial("assignment_item_id").primaryKey(),
  inventoryId: integer("inventory_id")
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

// Define relations
export const assignmentItemsRelations = relations(
  assignmentItems,
  ({ one, many }) => ({
    inventoryAssignment: one(inventoryAssignments, {
      fields: [assignmentItems.inventoryId],
      references: [inventoryAssignments.inventoryId],
    }),
    inventoryItem: one(inventoryItem, {
      fields: [assignmentItems.inventoryItemId],
      references: [inventoryItem.inventoryItemId],
    }),
    transactions: many(itemTransactions),
  })
);

export default assignmentItems;

// Import after relations to avoid circular dependency
import { itemTransactions } from "./item-transactions";
