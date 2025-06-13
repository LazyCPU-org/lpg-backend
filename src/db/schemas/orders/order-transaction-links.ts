import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { tankTransactions } from "../inventory/tank-transactions";
import { itemTransactions } from "../inventory/item-transactions";

export const orderTransactionLinks = pgTable("order_transaction_links", {
  linkId: serial("link_id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.orderId),
  tankTransactionId: integer("tank_transaction_id").references(
    () => tankTransactions.transactionId
  ),
  itemTransactionId: integer("item_transaction_id").references(
    () => itemTransactions.itemTransactionId
  ),
  deliveryId: integer("delivery_id").references(() => orderDeliveries.deliveryId),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const orderTransactionLinksRelations = relations(
  orderTransactionLinks,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderTransactionLinks.orderId],
      references: [orders.orderId],
    }),
    tankTransaction: one(tankTransactions, {
      fields: [orderTransactionLinks.tankTransactionId],
      references: [tankTransactions.transactionId],
    }),
    itemTransaction: one(itemTransactions, {
      fields: [orderTransactionLinks.itemTransactionId],
      references: [itemTransactions.itemTransactionId],
    }),
    delivery: one(orderDeliveries, {
      fields: [orderTransactionLinks.deliveryId],
      references: [orderDeliveries.deliveryId],
    }),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default orderTransactionLinks;

// Import after relations to avoid circular dependency
import { orderDeliveries } from "./order-deliveries";