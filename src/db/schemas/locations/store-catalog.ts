import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { stores } from ".";
import { inventoryItem, tankType } from "../inventory";

/**
 * Defines which tank types are available at each store
 * Acts as a template for daily inventory assignments
 */
export const storeCatalogTanks = pgTable(
  "store_inventory_tanks",
  {
    storeCatalogTankId: serial("store_catalog_tank_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    tankTypeId: integer("tank_type_id")
      .notNull()
      .references(() => tankType.typeId),
    defaultPurchasePrice: decimal("default_purchase_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    defaultSellPrice: decimal("default_sell_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isActive: boolean("is_active").default(true),
    defaultFullTanks: integer("default_full_tanks").default(0),
    defaultEmptyTanks: integer("default_empty_tanks").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_store_tank_type").on(table.storeId, table.tankTypeId),
  ]
);

/**
 * Defines which items are available at each store
 * Acts as a template for daily inventory assignments
 */
export const storeCatalogItems = pgTable(
  "store_catalog_items",
  {
    storeCatalogItemId: serial("store_catalog_item_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.inventoryItemId),
    defaultPurchasePrice: decimal("default_purchase_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    defaultSellPrice: decimal("default_sell_price", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isActive: boolean("is_active").default(true),
    // Optional: default quantities for auto-assignment
    defaultQuantity: integer("default_quantity").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    unique("unique_store_inventory_item").on(
      table.storeId,
      table.inventoryItemId
    ),
  ]
);

// Relations
export const storeCatalogTanksRelations = relations(
  storeCatalogTanks,
  ({ one }) => ({
    store: one(stores, {
      fields: [storeCatalogTanks.storeId],
      references: [stores.storeId],
    }),
    tankType: one(tankType, {
      fields: [storeCatalogTanks.tankTypeId],
      references: [tankType.typeId],
    }),
  })
);

export const storeCatalogItemsRelations = relations(
  storeCatalogItems,
  ({ one }) => ({
    store: one(stores, {
      fields: [storeCatalogItems.storeId],
      references: [stores.storeId],
    }),
    inventoryItem: one(inventoryItem, {
      fields: [storeCatalogItems.inventoryItemId],
      references: [inventoryItem.inventoryItemId],
    }),
  })
);
