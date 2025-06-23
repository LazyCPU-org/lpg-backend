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
 * Defines specifically the types of tanks managed
 * Table used to reference all logic related to tanks inventory
 */
export const tankType = pgTable("tank_type", {
  typeId: serial("type_id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  weight: varchar("weight", { length: 5 }).notNull(),
  description: text("description"),
  purchase_price: decimal("purchase_price", {
    precision: 10,
    scale: 2,
  }).notNull(),
  sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  scale: varchar("scale", { length: 10 }).notNull().default("unidad"),
  is_active: boolean("is_active").default(true).notNull(),
  is_popular: boolean("is_popular").default(false).notNull(),
  deleted_at: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const tankTypeRelations = relations(tankType, ({ many }) => ({
  assignmentTanks: many(assignmentTanks),
  storeCatalogTanks: many(storeCatalogTanks),
  orderItems: many(orderItems),
  reservations: many(inventoryReservations),
}));

export default tankType;

// Import after relations to avoid circular dependency
import { storeCatalogTanks } from "../locations";
import { inventoryReservations, orderItems } from "../orders";
import { assignmentTanks } from "./inventory-assignments-tanks";
