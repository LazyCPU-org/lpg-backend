import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { tankType } from "../inventory/tank-type";
import { inventoryItem } from "../inventory/inventory-item";
import { users } from "../user-management/users";

// Define item type enum values
export const ItemTypeEnum = {
  TANK: "tank",
  ITEM: "item", // Changed from ACCESSORY to ITEM to match inventory
} as const;

// Define delivery status enum values
export const DeliveryStatusEnum = {
  PENDING: "pending",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Define enum values restriction in database
export const itemTypeEnum = pgEnum("order_item_type_enum", [
  ItemTypeEnum.TANK,
  ItemTypeEnum.ITEM,
]);

export const deliveryStatusEnum = pgEnum("delivery_status_enum", [
  DeliveryStatusEnum.PENDING,
  DeliveryStatusEnum.DELIVERED,
  DeliveryStatusEnum.CANCELLED,
]);

export const orderItems = pgTable(
  "order_items",
  {
    itemId: serial("item_id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.orderId),
    itemType: itemTypeEnum().notNull(),
    tankTypeId: integer("tank_type_id").references(() => tankType.typeId),
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItem.inventoryItemId
    ),
    quantity: integer("quantity").notNull(),
    tankReturned: boolean("tank_returned").default(true),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
    deliveryStatus: deliveryStatusEnum().default(DeliveryStatusEnum.PENDING),
    deliveredBy: integer("delivered_by").references(() => users.userId),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

// Define relations
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.orderId],
  }),
  tankType: one(tankType, {
    fields: [orderItems.tankTypeId],
    references: [tankType.typeId],
  }),
  inventoryItem: one(inventoryItem, {
    fields: [orderItems.inventoryItemId],
    references: [inventoryItem.inventoryItemId],
  }),
  deliveredByUser: one(users, {
    fields: [orderItems.deliveredBy],
    references: [users.userId],
  }),
}));

// Note: Zod schemas moved to DTOs following inventory pattern

export default orderItems;
