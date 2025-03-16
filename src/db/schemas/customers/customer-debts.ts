import {
  pgTable,
  serial,
  integer,
  decimal,
  text,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { customers } from "./customers";
import { orders } from "../orders/orders";

export const customerDebts = pgTable("customer_debts", {
  debtId: serial("debt_id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.customerId),
  orderId: integer("order_id").references(() => orders.orderId),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  debtDate: timestamp("debt_date").defaultNow(),
  dueDate: date("due_date"),
  isPaid: boolean("is_paid").default(false),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertCustomerDebtSchema = createInsertSchema(customerDebts);
export const selectCustomerDebtSchema = createSelectSchema(customerDebts);

export type CustomerDebt = z.infer<typeof selectCustomerDebtSchema>;
export type NewCustomerDebt = z.infer<typeof insertCustomerDebtSchema>;

export default customerDebts;
