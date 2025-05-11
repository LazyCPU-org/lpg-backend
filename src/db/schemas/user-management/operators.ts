import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

// Define the operators table
export const operators = pgTable("operators", {
  operatorId: serial("operator_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertOperatorSchema = createInsertSchema(operators);
export const selectOperatorSchema = createSelectSchema(operators);

export type Operator = z.infer<typeof selectOperatorSchema>;
export type NewOperator = z.infer<typeof insertOperatorSchema>;

export default operators;
