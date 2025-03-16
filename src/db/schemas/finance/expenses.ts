import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  date,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { users } from "../user-management/users";

export const expenses = pgTable("expenses", {
  expenseId: serial("expense_id").primaryKey(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.storeId),
  expenseDate: date("expense_date").notNull(),
  expenseType: varchar("expense_type", { length: 50 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertExpenseSchema = createInsertSchema(expenses);
export const selectExpenseSchema = createSelectSchema(expenses);

export type Expense = z.infer<typeof selectExpenseSchema>;
export type NewExpense = z.infer<typeof insertExpenseSchema>;

export default expenses;
