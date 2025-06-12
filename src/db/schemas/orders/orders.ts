import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  decimal,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { customers } from "../customers/customers";
import { stores } from "../locations/stores";
import { users } from "../user-management/users";
import { OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum, orderStatusEnum } from "./order-status-types";

export const orders = pgTable(
  "orders",
  {
    orderId: serial("order_id").primaryKey(),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    customerId: integer("customer_id").references(() => customers.customerId),
    customerName: varchar("customer_name", { length: 255 }),
    customerPhone: varchar("customer_phone", { length: 20 }),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    orderDate: timestamp("order_date").defaultNow(),
    deliveryAddress: text("delivery_address").notNull(),
    locationReference: text("location_reference"),
    status: orderStatusEnum().default(OrderStatusEnum.PENDING),
    priority: integer("priority").default(1),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull().$type<typeof PaymentMethodEnum[keyof typeof PaymentMethodEnum]>(),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().$type<typeof PaymentStatusEnum[keyof typeof PaymentStatusEnum]>(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.userId),
    deliveredBy: integer("delivered_by").references(() => users.userId),
    deliveryDate: timestamp("delivery_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique().on(table.orderNumber),
  ]
);

// Define relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.customerId],
  }),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.storeId],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.userId],
    relationName: "createdOrders",
  }),
  deliveredByUser: one(users, {
    fields: [orders.deliveredBy],
    references: [users.userId],
    relationName: "deliveredOrders",
  }),
  orderItems: many(orderItems),
  reservations: many(inventoryReservations),
  transactionLinks: many(orderTransactionLinks),
  deliveries: many(orderDeliveries),
  statusHistory: many(orderStatusHistory),
  invoice: one(invoices, {
    fields: [orders.orderId],
    references: [invoices.orderId],
  }),
}));

// Note: Zod schemas moved to DTOs following inventory pattern

export default orders;

// Import after relations to avoid circular dependency
import { orderItems } from "./order-items";
import { inventoryReservations } from "./inventory-reservations";
import { orderTransactionLinks } from "./order-transaction-links";
import { orderDeliveries } from "./order-deliveries";
import { orderStatusHistory } from "./order-status-history";
import { invoices } from "./invoices";
