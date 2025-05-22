import { relations } from "drizzle-orm";
import {
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { inventoryAssignments } from "./inventory-assignments";
import { tankType } from "./tank-type";

/**
 * Defines the tanks associated with an inventory assignment
 */
export const assignmentTanks = pgTable(
  "assignment_tanks",
  {
    assignmentTankId: serial("assignment_tank_id").primaryKey(),
    inventoryId: integer("inventory_id")
      .notNull()
      .references(() => inventoryAssignments.inventoryId),
    tankTypeId: integer("tank_type_id")
      .notNull()
      .references(() => tankType.typeId),
    purchase_price: decimal("purchase_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
    assignedFullTanks: integer("assigned_full_tanks").notNull().default(0),
    currentFullTanks: integer("current_full_tanks").notNull().default(0),
    assignedEmptyTanks: integer("assigned_empty_tanks").default(0),
    currentEmptyTanks: integer("current_empty_tanks").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_inventory_tank_type").on(
      table.inventoryId,
      table.tankTypeId
    ),
  ]
);

// Define relations
export const assignmentTanksRelations = relations(
  assignmentTanks,
  ({ one, many }) => ({
    inventoryAssignment: one(inventoryAssignments, {
      fields: [assignmentTanks.inventoryId],
      references: [inventoryAssignments.inventoryId],
    }),
    tankType: one(tankType, {
      fields: [assignmentTanks.tankTypeId],
      references: [tankType.typeId],
    }),
    transactions: many(tankTransactions), // Will be added in index.ts due to circular dependency
  })
);

export default assignmentTanks;

// Import after relations to avoid circular dependency
import { tankTransactions } from "./tank-transactions";
