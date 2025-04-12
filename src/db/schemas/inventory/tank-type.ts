import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  timestamp,
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
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertTankTypeSchema = createInsertSchema(tankType);
export const selectTankTypeSchema = createSelectSchema(tankType);

export type TankType = z.infer<typeof selectTankTypeSchema>;
export type NewTankType = z.infer<typeof insertTankTypeSchema>;

export default tankType;
