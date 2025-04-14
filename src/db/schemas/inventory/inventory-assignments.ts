import {
  pgTable,
  integer,
  text,
  date,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";
import { storeAssignments } from "../locations";
import { serial } from "drizzle-orm/pg-core";

// Define status enum values
export const AssignmentStatusEnum = {
  CREATED: "created", // 1. Base status after validation or creation
  ASSIGNED: "assigned", // 2. Confirmation to start day sales
  VALIDATED: "validated", // 3. End of day conformity
} as const;

// Define enum values restriction in database
export const inventoryStatusEnum = pgEnum("assignment_status_check", [
  AssignmentStatusEnum.ASSIGNED,
  AssignmentStatusEnum.CREATED,
  AssignmentStatusEnum.VALIDATED,
]);

/**
 * Defines the association concept for the assignment's (user and store) inventory.
 * This table will hold information about the consolidation of inventory given a date
 */
export const inventoryAssignments = pgTable("inventory_assignments", {
  inventoryId: serial("inventory_id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => storeAssignments.assignmentId),
  assignmentDate: date("assignment_date").notNull(),
  assignedBy: integer("assigned_by")
    .notNull()
    .references(() => users.userId),
  status: inventoryStatusEnum().default(AssignmentStatusEnum.CREATED),
  autoAssignment: boolean().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertInventoryAssignmentSchema = createInsertSchema(
  inventoryAssignments,
  {
    status: z.enum([
      AssignmentStatusEnum.ASSIGNED,
      AssignmentStatusEnum.CREATED,
      AssignmentStatusEnum.VALIDATED,
    ]),
  }
);

export const selectInventoryAssignmentSchema = createSelectSchema(
  inventoryAssignments,
  {
    status: z.enum([
      AssignmentStatusEnum.ASSIGNED,
      AssignmentStatusEnum.CREATED,
      AssignmentStatusEnum.VALIDATED,
    ]),
  }
);

export type InventoryAssignment = z.infer<
  typeof selectInventoryAssignmentSchema
>;
export type NewInventoryAssignment = z.infer<
  typeof insertInventoryAssignmentSchema
>;

export default inventoryAssignments;
