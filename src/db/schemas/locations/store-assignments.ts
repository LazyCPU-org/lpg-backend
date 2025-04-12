import {
  pgTable,
  serial,
  integer,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";
import { stores } from "./stores";

/**
 * Defines the association between the user and his designed store
 */
export const storeAssignments = pgTable(
  "store_assignments",
  {
    assignmentId: serial("assignment_id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    {
      uniqueAssignment: uniqueIndex("unique_store_assignment").on(
        table.userId,
        table.storeId,
        table.startDate
      ),
    },
  ]
);

// Create Zod schemas for validation
export const insertStoreAssignmentSchema = createInsertSchema(storeAssignments);
export const selectStoreAssignmentSchema = createSelectSchema(storeAssignments);

export type StoreAssignment = z.infer<typeof selectStoreAssignmentSchema>;
export type NewStoreAssignment = z.infer<typeof insertStoreAssignmentSchema>;

export default storeAssignments;
