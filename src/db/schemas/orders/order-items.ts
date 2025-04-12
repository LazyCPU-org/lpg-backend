import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { orders } from "./orders";
import { tankType } from "../inventory/tank-type";
import { inventoryItem } from "../inventory/inventory-item";
import { deliveryPersonnel } from "../user-management/delivery-personnel";

// Define item type enum values
export const ItemTypeEnum = {
  TANK: "tank",
  ACCESSORY: "accessory",
} as const;

export const orderItems = pgTable(
  "order_items",
  {
    itemId: serial("item_id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.orderId),
    itemType: varchar("item_type", { length: 10 }).notNull(),
    tankTypeId: integer("tank_type_id").references(() => tankType.typeId),
    accessoryId: integer("accessory_id").references(
      () => inventoryItem.inventoryItemId
    ),
    quantity: integer("quantity").notNull(),
    tankReturned: boolean("tank_returned").default(true),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    deliveredBy: integer("delivered_by").references(
      () => deliveryPersonnel.personId
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "item_type_check",
      sql`${table.itemType} IN ('${sql.raw(ItemTypeEnum.TANK)}', '${sql.raw(
        ItemTypeEnum.ACCESSORY
      )}')`
    ),
    check(
      "item_type_tank_check",
      sql`(${table.itemType} = '${sql.raw(ItemTypeEnum.TANK)}' AND ${
        table.tankTypeId
      } IS NOT NULL AND ${table.accessoryId} IS NULL) OR
          (${table.itemType} = '${sql.raw(ItemTypeEnum.ACCESSORY)}' AND ${
        table.accessoryId
      } IS NOT NULL AND ${table.tankTypeId} IS NULL)`
    ),
  ]
);

// Create Zod schemas for validation
export const insertOrderItemSchema = createInsertSchema(orderItems, {
  itemType: z.enum([ItemTypeEnum.TANK, ItemTypeEnum.ACCESSORY]),
  // Additional validation to ensure the right IDs are provided based on item type
  tankTypeId: z
    .number()
    .optional()
    .refine((val) => val === undefined || val !== null, {
      message: "tankTypeId must be provided when itemType is 'tank'",
    }),
  accessoryId: z
    .number()
    .optional()
    .refine((val) => val === undefined || val !== null, {
      message: "accessoryId must be provided when itemType is 'accessory'",
    }),
});

export const selectOrderItemSchema = createSelectSchema(orderItems, {
  itemType: z.enum([ItemTypeEnum.TANK, ItemTypeEnum.ACCESSORY]),
});

export type OrderItem = z.infer<typeof selectOrderItemSchema>;
export type NewOrderItem = z.infer<typeof insertOrderItemSchema>;

export default orderItems;
