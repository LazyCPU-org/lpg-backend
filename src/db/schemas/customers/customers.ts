import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define customer type enum values
export const CustomerTypeEnum = {
  REGULAR: "regular",
  WHOLESALE: "wholesale",
  RECURRENT: "recurrent",
} as const;

export const customers = pgTable(
  "customers",
  {
    customerId: serial("customer_id").primaryKey(),
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 15 }).notNull(),
    alternativePhone: varchar("alternative_phone", { length: 15 }),
    address: text("address").notNull(),
    locationReference: text("location_reference"),
    customerType: varchar("customer_type", { length: 20 }).default(
      CustomerTypeEnum.REGULAR
    ),
    rating: integer("rating"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "customer_type_check",
      sql`${table.customerType} IN ('${sql.raw(
        CustomerTypeEnum.REGULAR
      )}', '${sql.raw(CustomerTypeEnum.WHOLESALE)}', '${sql.raw(
        CustomerTypeEnum.RECURRENT
      )}')`
    ),
    check("rating_range_check", sql`${table.rating} BETWEEN 1 AND 5`),
  ]
);

// Create Zod schemas for validation
export const insertCustomerSchema = createInsertSchema(customers, {
  customerType: z
    .enum([
      CustomerTypeEnum.REGULAR,
      CustomerTypeEnum.WHOLESALE,
      CustomerTypeEnum.RECURRENT,
    ])
    .default(CustomerTypeEnum.REGULAR),
  rating: z.number().min(1).max(5).optional(),
});

export const selectCustomerSchema = createSelectSchema(customers, {
  customerType: z.enum([
    CustomerTypeEnum.REGULAR,
    CustomerTypeEnum.WHOLESALE,
    CustomerTypeEnum.RECURRENT,
  ]),
  rating: z.number().min(1).max(5).optional(),
});

export type Customer = z.infer<typeof selectCustomerSchema>;
export type NewCustomer = z.infer<typeof insertCustomerSchema>;

export default customers;
