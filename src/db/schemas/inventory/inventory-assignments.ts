import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { storeAssignments } from "../locations";
import { users } from "../user-management/users";

// Define status enum values
export const AssignmentStatusEnum = {
  CREATED: "created",
  ASSIGNED: "assigned",
  CONSOLIDATED: "consolidated",
  VALIDATED: "validated",
  OBSERVED: "observed",
} as const;

// Define enum values restriction in database
export const inventoryStatusEnum = pgEnum("assignment_status_check", [
  AssignmentStatusEnum.CREATED,
  AssignmentStatusEnum.ASSIGNED,
  AssignmentStatusEnum.CONSOLIDATED,
  AssignmentStatusEnum.VALIDATED,
  AssignmentStatusEnum.OBSERVED,
]);

/**
 * Defines the association concept for the assignment's (user and store) inventory.
 * This table will hold information about the consolidation of inventory given a date
 */
export const inventoryAssignments = pgTable(
  "inventory_assignments",
  {
    inventoryId: serial("inventory_id").primaryKey(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => storeAssignments.assignmentId),
    assignmentDate: date("assignment_date", { mode: "string" })
      .defaultNow()
      .notNull(),
    assignedBy: integer("assigned_by")
      .notNull()
      .references(() => users.userId),
    status: inventoryStatusEnum().default(AssignmentStatusEnum.CREATED),
    autoAssignment: boolean().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [unique().on(table.assignmentId, table.assignmentDate)]
);

// Define relations
export const inventoryAssignmentsRelations = relations(
  inventoryAssignments,
  ({ one, many }) => ({
    storeAssignment: one(storeAssignments, {
      fields: [inventoryAssignments.assignmentId],
      references: [storeAssignments.assignmentId],
    }),
    assignedByUser: one(users, {
      fields: [inventoryAssignments.assignedBy],
      references: [users.userId],
    }),
    assignmentTanks: many(assignmentTanks),
    assignmentItems: many(assignmentItems),
    statusHistory: many(inventoryStatusHistory),
  })
);

export default inventoryAssignments;

// Import after relations to avoid circular dependency
import { inventoryStatusHistory } from "../audit";
import { assignmentItems } from "./inventory-assignments-items";
import { assignmentTanks } from "./inventory-assignments-tanks";
