import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define the accessories table
export const accessories = pgTable("accessories", {
  accessoryId: serial("accessory_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertAccessorySchema = createInsertSchema(accessories);
export const selectAccessorySchema = createSelectSchema(accessories);

export type Accessory = z.infer<typeof selectAccessorySchema>;
export type NewAccessory = z.infer<typeof insertAccessorySchema>;

export default accessories;
