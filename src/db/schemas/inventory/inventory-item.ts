import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Defines the different items the business is selling like kitchen accessories
 * Table used to reference all logic related to any other item different from tanks
 */
export const inventoryItem = pgTable("inventory_item", {
  inventoryItemId: serial("inventory_item_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  purchase_price: decimal("purchase_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  scale: varchar("scale", { length: 10 }).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  is_popular: boolean("is_popular").default(false).notNull(),
  deleted_at: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const inventoryItemRelations = relations(inventoryItem, ({ many }) => ({
  assignmentItems: many(assignmentItems),
  storeCatalogItems: many(storeCatalogItems),
  orderItems: many(orderItems),
  reservations: many(inventoryReservations),
}));

export default inventoryItem;

// Import after relations to avoid circular dependency
import { storeCatalogItems } from "../locations";
import { inventoryReservations, orderItems } from "../orders";
import { assignmentItems } from "./inventory-assignments-items";
