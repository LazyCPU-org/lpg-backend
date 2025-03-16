import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { orders } from "./orders";
import { customers } from "../customers/customers";

// Define invoice status enum values
export const InvoiceStatusEnum = {
  ISSUED: "issued",
  CANCELLED: "cancelled",
} as const;

export const invoices = pgTable(
  "invoices",
  {
    invoiceId: serial("invoice_id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.orderId),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    issueDate: timestamp("issue_date").defaultNow(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.customerId),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "invoice_status_check",
      sql`${table.status} IN ('${sql.raw(
        InvoiceStatusEnum.ISSUED
      )}', '${sql.raw(InvoiceStatusEnum.CANCELLED)}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertInvoiceSchema = createInsertSchema(invoices, {
  status: z.enum([InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.CANCELLED]),
});

export const selectInvoiceSchema = createSelectSchema(invoices, {
  status: z.enum([InvoiceStatusEnum.ISSUED, InvoiceStatusEnum.CANCELLED]),
});

export type Invoice = z.infer<typeof selectInvoiceSchema>;
export type NewInvoice = z.infer<typeof insertInvoiceSchema>;

export default invoices;
