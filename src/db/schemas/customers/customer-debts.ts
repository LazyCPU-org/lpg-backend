import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  decimal,
  text,
  boolean,
  date,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { orders } from "../orders/orders";

export const customerDebts = pgTable(
  "customer_debts",
  {
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
  },
  (table) => [
    check("amount_positive", sql`amount > 0`),
  ]
);

// Define relations
export const customerDebtsRelations = relations(customerDebts, ({ one }) => ({
  customer: one(customers, {
    fields: [customerDebts.customerId],
    references: [customers.customerId],
  }),
  order: one(orders, {
    fields: [customerDebts.orderId],
    references: [orders.orderId],
  }),
}));

// Note: Zod schemas moved to DTOs following inventory/orders pattern

export default customerDebts;
