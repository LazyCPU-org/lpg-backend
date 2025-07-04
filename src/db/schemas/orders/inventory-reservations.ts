import { relations, sql } from "drizzle-orm";
import {
  check,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { inventoryItem } from "../inventory/inventory-item";
import { tankType } from "../inventory/tank-type";
import { storeAssignments } from "../locations/store-assignments";
import { ItemTypeEnum } from "./order-types";
import { orders } from "./orders";

// Define reservation status enum values
export enum ReservationStatusEnum {
  ACTIVE = "active",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

// Define enum values restriction in database
export const reservationItemTypeEnum = pgEnum("reservation_item_type_enum", [
  ItemTypeEnum.TANK,
  ItemTypeEnum.ITEM,
]);

export const reservationStatusEnum = pgEnum("reservation_status_enum", [
  ReservationStatusEnum.ACTIVE,
  ReservationStatusEnum.FULFILLED,
  ReservationStatusEnum.CANCELLED,
  ReservationStatusEnum.EXPIRED,
]);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    reservationId: serial("reservation_id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.orderId),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => storeAssignments.assignmentId),
    currentInventoryId: integer("current_inventory_id").notNull(), // Links to current active inventory
    itemType: reservationItemTypeEnum().notNull(),
    tankTypeId: integer("tank_type_id").references(() => tankType.typeId),
    inventoryItemId: integer("inventory_item_id").references(
      () => inventoryItem.inventoryItemId
    ),
    reservedQuantity: integer("reserved_quantity").notNull(),
    status: reservationStatusEnum().default(ReservationStatusEnum.ACTIVE),
    expiresAt: timestamp("expires_at"), // Optional expiration for reservations
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [check("reserved_quantity_positive", sql`reserved_quantity > 0`)]
);

// Define relations
export const inventoryReservationsRelations = relations(
  inventoryReservations,
  ({ one }) => ({
    order: one(orders, {
      fields: [inventoryReservations.orderId],
      references: [orders.orderId],
    }),
    storeAssignment: one(storeAssignments, {
      fields: [inventoryReservations.assignmentId],
      references: [storeAssignments.assignmentId],
    }),
    tankType: one(tankType, {
      fields: [inventoryReservations.tankTypeId],
      references: [tankType.typeId],
    }),
    inventoryItem: one(inventoryItem, {
      fields: [inventoryReservations.inventoryItemId],
      references: [inventoryItem.inventoryItemId],
    }),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default inventoryReservations;
