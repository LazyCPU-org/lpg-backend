import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { supplierOrders } from "./supplier-orders";
import { tankTypes } from "../inventory/tank-type";

export const supplierOrderItems = pgTable("supplier_order_items", {
  itemId: serial("item_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => supplierOrders.orderId),
  tankTypeId: integer("tank_type_id")
    .notNull()
    .references(() => tankTypes.typeId),
  fullTanksOrdered: integer("full_tanks_ordered").notNull(),
  emptyTanksReturned: integer("empty_tanks_returned").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertSupplierOrderItemSchema =
  createInsertSchema(supplierOrderItems);
export const selectSupplierOrderItemSchema =
  createSelectSchema(supplierOrderItems);

export type SupplierOrderItem = z.infer<typeof selectSupplierOrderItemSchema>;
export type NewSupplierOrderItem = z.infer<
  typeof insertSupplierOrderItemSchema
>;

export default supplierOrderItems;
