import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { users } from "../user-management/users";

// Define supplier order status enum values
export const SupplierOrderStatusEnum = {
  PENDING: "pending",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const supplierOrders = pgTable(
  "supplier_orders",
  {
    orderId: serial("order_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    orderDate: timestamp("order_date").defaultNow(),
    deliveryDate: timestamp("delivery_date"),
    status: varchar("status", { length: 20 }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "supplier_order_status_check",
      sql`${table.status} IN ('${sql.raw(
        SupplierOrderStatusEnum.PENDING
      )}', '${sql.raw(SupplierOrderStatusEnum.DELIVERED)}', '${sql.raw(
        SupplierOrderStatusEnum.CANCELLED
      )}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertSupplierOrderSchema = createInsertSchema(supplierOrders, {
  status: z.enum([
    SupplierOrderStatusEnum.PENDING,
    SupplierOrderStatusEnum.DELIVERED,
    SupplierOrderStatusEnum.CANCELLED,
  ]),
});

export const selectSupplierOrderSchema = createSelectSchema(supplierOrders, {
  status: z.enum([
    SupplierOrderStatusEnum.PENDING,
    SupplierOrderStatusEnum.DELIVERED,
    SupplierOrderStatusEnum.CANCELLED,
  ]),
});

export type SupplierOrder = z.infer<typeof selectSupplierOrderSchema>;
export type NewSupplierOrder = z.infer<typeof insertSupplierOrderSchema>;

export default supplierOrders;
