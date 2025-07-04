import { pgTable, serial, integer, date, timestamp } from "drizzle-orm/pg-core";
import { users } from "../user-management/users";
import { stores } from "./stores";
import { relations } from "drizzle-orm";

/**
 * Defines the association between the user and his designed store
 */
export const storeAssignments = pgTable("store_assignments", {
  assignmentId: serial("assignment_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.storeId),
  startDate: date("start_date").notNull().defaultNow(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations for the storeAssignments table
export const storeAssignmentsRelations = relations(
  storeAssignments,
  ({ one, many }) => ({
    // Define the one-to-many relationship with the user
    user: one(users, {
      relationName: "user",
      fields: [storeAssignments.userId],
      references: [users.userId],
    }),
    // Define the one-to-many relationship with the store
    store: one(stores, {
      relationName: "store",
      fields: [storeAssignments.storeId],
      references: [stores.storeId],
    }),
    // Define the one-to-one relationship with current inventory state
    currentInventoryState: one(storeAssignmentCurrentInventory, {
      relationName: "currentInventoryState",
      fields: [storeAssignments.assignmentId],
      references: [storeAssignmentCurrentInventory.assignmentId],
    }),
    // Define the one-to-many relationship with assigned orders
    assignedOrders: many(orders, {
      relationName: "assignedOrders",
    }),
  })
);

export default storeAssignments;

// Import after relations to avoid circular dependency
import { storeAssignmentCurrentInventory } from "./store-assignment-current-inventory";
import { orders } from "../orders/orders";
