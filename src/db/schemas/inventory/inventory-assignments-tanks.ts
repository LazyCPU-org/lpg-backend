import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { inventoryAssignments } from "./inventory-assignments";
import { tankType } from "./tank-type";

/**
 * Defines the tanks associated with an inventory assignment
 */
export const assignmentTanks = pgTable("assignment_tanks", {
  assignmentTankId: serial("assignment_tank_id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => inventoryAssignments.inventoryId),
  tankTypeId: integer("tank_type_id")
    .notNull()
    .references(() => tankType.typeId),
  assignedFullTanks: integer("assigned_full_tanks").notNull().default(0),
  currentFullTanks: integer("current_full_tanks").notNull().default(0),
  assignedEmptyTanks: integer("assigned_empty_tanks").default(0),
  currentEmptyTanks: integer("current_empty_tanks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertInventoryTankSchema = createInsertSchema(assignmentTanks);
export const selectInventoryTankSchema = createSelectSchema(assignmentTanks);

export type InventoryTank = z.infer<typeof selectInventoryTankSchema>;
export type NewInventoryTank = z.infer<typeof insertInventoryTankSchema>;

export default assignmentTanks;
