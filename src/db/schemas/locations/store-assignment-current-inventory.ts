import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { storeAssignments } from "./store-assignments";
import { users } from "../user-management/users";

/**
 * Tracks the current active inventory for each store assignment
 * This table breaks the circular dependency between store_assignments and inventory_assignments
 * by providing a separate temporal state tracking mechanism
 */
export const storeAssignmentCurrentInventory = pgTable("store_assignment_current_inventory", {
  assignmentId: integer("assignment_id")
    .primaryKey()
    .references(() => storeAssignments.assignmentId),
  currentInventoryId: integer("current_inventory_id")
    .notNull(),
  setAt: timestamp("set_at").defaultNow().notNull(),
  setBy: integer("set_by")
    .notNull()
    .references(() => users.userId),
});

// Define relations
export const storeAssignmentCurrentInventoryRelations = relations(
  storeAssignmentCurrentInventory,
  ({ one }) => ({
    // Relationship to store assignment
    storeAssignment: one(storeAssignments, {
      relationName: "currentInventoryState",
      fields: [storeAssignmentCurrentInventory.assignmentId],
      references: [storeAssignments.assignmentId],
    }),
    // Relationship to user who set the current inventory
    setByUser: one(users, {
      relationName: "setByUser",
      fields: [storeAssignmentCurrentInventory.setBy],
      references: [users.userId],
    }),
    // Note: currentInventory relation is defined in inventory schema to avoid circular dependency
  })
);

export default storeAssignmentCurrentInventory;