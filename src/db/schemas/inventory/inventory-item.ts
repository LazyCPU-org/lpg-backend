import {
  pgTable,
  serial,
  timestamp,
  decimal,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Defines the different items the business is selling like kitchen accessories
 * Table used to reference all logic related to any other item different from tanks
 */
export const inventoryItem = pgTable("inventory_item", {
  inventoryItemId: serial("inventory_item_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  currentPrice: decimal("current_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertInventoryItemSchema = createInsertSchema(inventoryItem);
export const selectInventoryItemSchema = createSelectSchema(inventoryItem);

export type InventoryItem = z.infer<typeof selectInventoryItemSchema>;
export type NewInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export default inventoryItem;
