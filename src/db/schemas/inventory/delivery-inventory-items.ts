import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { deliveryInventoryAssignments } from "./delivery-inventory-assignments";
import { tankTypes } from "./tank-types";

export const deliveryInventoryItems = pgTable("delivery_inventory_items", {
  itemId: serial("item_id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => deliveryInventoryAssignments.assignmentId),
  tankTypeId: integer("tank_type_id")
    .notNull()
    .references(() => tankTypes.typeId),
  fullTanksAssigned: integer("full_tanks_assigned").notNull().default(0),
  emptyTanksAssigned: integer("empty_tanks_assigned").notNull().default(0),
  fullTanksReturned: integer("full_tanks_returned").default(0),
  emptyTanksReturned: integer("empty_tanks_returned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertDeliveryInventoryItemSchema = createInsertSchema(
  deliveryInventoryItems
);
export const selectDeliveryInventoryItemSchema = createSelectSchema(
  deliveryInventoryItems
);

export type DeliveryInventoryItem = z.infer<
  typeof selectDeliveryInventoryItemSchema
>;
export type NewDeliveryInventoryItem = z.infer<
  typeof insertDeliveryInventoryItemSchema
>;

export default deliveryInventoryItems;
