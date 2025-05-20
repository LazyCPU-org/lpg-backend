import { relations } from "drizzle-orm";
import {
  decimal,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const tankTypeRelations = relations(tankType, ({ many }) => ({
  assignmentTanks: many(assignmentTanks),
}));

// Create Zod schemas for validation
export const insertTankTypeSchema = createInsertSchema(tankType);
export const selectTankTypeSchema = createSelectSchema(tankType);

export type TankType = z.infer<typeof selectTankTypeSchema>;
export type NewTankType = z.infer<typeof insertTankTypeSchema>;

export default tankType;

// Import after relations to avoid circular dependency
import { assignmentTanks } from "./inventory-assignments-tanks";
