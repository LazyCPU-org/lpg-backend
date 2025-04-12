import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  decimal,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { customers } from "../customers/customers";
import { stores } from "../locations/stores";
import { operators } from "../user-management/operators";
import { deliveryPersonnel } from "../user-management/delivery-personnel";

// Define order status enum values
export const OrderStatusEnum = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Define payment method enum values
export const PaymentMethodEnum = {
  CASH: "cash",
  YAPE: "yape",
  PLIN: "plin",
  TRANSFER: "transfer",
} as const;

// Define payment status enum values
export const PaymentStatusEnum = {
  PENDING: "pending",
  PAID: "paid",
  DEBT: "debt",
} as const;

export const orders = pgTable(
  "orders",
  {
    orderId: serial("order_id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.customerId),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    orderDate: timestamp("order_date").defaultNow(),
    deliveryAddress: text("delivery_address").notNull(),
    locationReference: text("location_reference"),
    status: varchar("status", { length: 20 }).notNull(),
    priority: integer("priority").default(1),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    receivedBy: integer("received_by").references(() => operators.operatorId),
    deliveredBy: integer("delivered_by").references(
      () => deliveryPersonnel.personId
    ),
    deliveryDate: timestamp("delivery_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "order_status_check",
      sql`${table.status} IN ('${sql.raw(OrderStatusEnum.PENDING)}', '${sql.raw(
        OrderStatusEnum.ASSIGNED
      )}', '${sql.raw(OrderStatusEnum.IN_TRANSIT)}', '${sql.raw(
        OrderStatusEnum.DELIVERED
      )}', '${sql.raw(OrderStatusEnum.CANCELLED)}')`
    ),
    check(
      "payment_method_check",
      sql`${table.paymentMethod} IN ('${sql.raw(
        PaymentMethodEnum.CASH
      )}', '${sql.raw(PaymentMethodEnum.YAPE)}', '${sql.raw(
        PaymentMethodEnum.PLIN
      )}', '${sql.raw(PaymentMethodEnum.TRANSFER)}')`
    ),
    check(
      "payment_status_check",
      sql`${table.paymentStatus} IN ('${sql.raw(
        PaymentStatusEnum.PENDING
      )}', '${sql.raw(PaymentStatusEnum.PAID)}', '${sql.raw(
        PaymentStatusEnum.DEBT
      )}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertOrderSchema = createInsertSchema(orders, {
  status: z.enum([
    OrderStatusEnum.PENDING,
    OrderStatusEnum.ASSIGNED,
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.CANCELLED,
  ]),
  paymentMethod: z.enum([
    PaymentMethodEnum.CASH,
    PaymentMethodEnum.YAPE,
    PaymentMethodEnum.PLIN,
    PaymentMethodEnum.TRANSFER,
  ]),
  paymentStatus: z.enum([
    PaymentStatusEnum.PENDING,
    PaymentStatusEnum.PAID,
    PaymentStatusEnum.DEBT,
  ]),
});

export const selectOrderSchema = createSelectSchema(orders, {
  status: z.enum([
    OrderStatusEnum.PENDING,
    OrderStatusEnum.ASSIGNED,
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.CANCELLED,
  ]),
  paymentMethod: z.enum([
    PaymentMethodEnum.CASH,
    PaymentMethodEnum.YAPE,
    PaymentMethodEnum.PLIN,
    PaymentMethodEnum.TRANSFER,
  ]),
  paymentStatus: z.enum([
    PaymentStatusEnum.PENDING,
    PaymentStatusEnum.PAID,
    PaymentStatusEnum.DEBT,
  ]),
});

export type Order = z.infer<typeof selectOrderSchema>;
export type NewOrder = z.infer<typeof insertOrderSchema>;

export default orders;
