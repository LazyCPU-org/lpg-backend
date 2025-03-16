import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";
import { stores } from "../locations/stores";

// Define status enum values
export const AssignmentStatusEnum = {
  ASSIGNED: "assigned",
  RETURNED: "returned",
  RECONCILED: "reconciled",
} as const;

export const deliveryInventoryAssignments = pgTable(
  "delivery_inventory_assignments",
  {
    assignmentId: serial("assignment_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId),
    assignmentDate: date("assignment_date").notNull(),
    assignedBy: integer("assigned_by")
      .notNull()
      .references(() => users.userId),
    status: varchar("status", { length: 20 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "assignment_status_check",
      sql`${table.status} IN ('${sql.raw(
        AssignmentStatusEnum.ASSIGNED
      )}', '${sql.raw(AssignmentStatusEnum.RETURNED)}', '${sql.raw(
        AssignmentStatusEnum.RECONCILED
      )}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertDeliveryInventoryAssignmentSchema = createInsertSchema(
  deliveryInventoryAssignments,
  {
    status: z.enum([
      AssignmentStatusEnum.ASSIGNED,
      AssignmentStatusEnum.RETURNED,
      AssignmentStatusEnum.RECONCILED,
    ]),
  }
);

export const selectDeliveryInventoryAssignmentSchema = createSelectSchema(
  deliveryInventoryAssignments,
  {
    status: z.enum([
      AssignmentStatusEnum.ASSIGNED,
      AssignmentStatusEnum.RETURNED,
      AssignmentStatusEnum.RECONCILED,
    ]),
  }
);

export type DeliveryInventoryAssignment = z.infer<
  typeof selectDeliveryInventoryAssignmentSchema
>;
export type NewDeliveryInventoryAssignment = z.infer<
  typeof insertDeliveryInventoryAssignmentSchema
>;

export default deliveryInventoryAssignments;
