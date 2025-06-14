import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  check,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// Define customer type enum values
export const CustomerTypeEnum = {
  REGULAR: "regular",
  WHOLESALE: "wholesale", 
  RECURRENT: "recurrent",
} as const;

// Define enum values restriction in database (following orders pattern)
export const customerTypeEnum = pgEnum("customer_type_enum", [
  CustomerTypeEnum.REGULAR,
  CustomerTypeEnum.WHOLESALE,
  CustomerTypeEnum.RECURRENT,
]);

export const customers = pgTable(
  "customers",
  {
    customerId: serial("customer_id").primaryKey(),
    firstName: varchar("first_name", { length: 50 }).notNull(),
    lastName: varchar("last_name", { length: 50 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(), // Increased for +51 format
    alternativePhone: varchar("alternative_phone", { length: 20 }),
    address: text("address").notNull(),
    locationReference: text("location_reference"),
    customerType: customerTypeEnum().default(CustomerTypeEnum.REGULAR), // Use pgEnum
    rating: integer("rating"),
    isActive: boolean("is_active").default(true),
    lastOrderDate: timestamp("last_order_date"), // For UX "last order" info
    preferredPaymentMethod: varchar("preferred_payment_method", { length: 20 }), // For UX smart defaults
    totalOrders: integer("total_orders").default(0), // For customer insights
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.phoneNumber), // Phone numbers should be unique for customer lookup
    check("rating_range_check", sql`${table.rating} BETWEEN 1 AND 5`),
    check("total_orders_positive", sql`${table.totalOrders} >= 0`),
  ]
);

// Note: Zod schemas moved to DTOs following inventory/orders pattern

// Define relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  debts: many(customerDebts),
}));

export default customers;

// Import after relations to avoid circular dependency
import { orders } from "../orders/orders";
import { customerDebts } from "./customer-debts";
