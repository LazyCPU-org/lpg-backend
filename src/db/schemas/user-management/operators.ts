import {
  pgTable,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { stores } from "../locations/stores";

// Define the operators table
export const operators = pgTable("operators", {
  operatorId: serial("operator_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.storeId),
  canCreateReports: boolean("can_create_reports").default(true),
  canModifyInventory: boolean("can_modify_inventory").default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertOperatorSchema = createInsertSchema(operators);
export const selectOperatorSchema = createSelectSchema(operators);

export type Operator = z.infer<typeof selectOperatorSchema>;
export type NewOperator = z.infer<typeof insertOperatorSchema>;

export default operators;
