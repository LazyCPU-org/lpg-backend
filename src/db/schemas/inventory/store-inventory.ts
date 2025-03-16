import {
  pgTable,
  serial,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { tankTypes } from "./tank-types";

// Define the store inventory table
export const storeInventory = pgTable(
  "store_inventory",
  {
    inventoryId: serial("inventory_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    tankTypeId: integer("tank_type_id")
      .notNull()
      .references(() => tankTypes.typeId),
    fullTanks: integer("full_tanks").notNull().default(0),
    emptyTanks: integer("empty_tanks").notNull().default(0),
    minStock: integer("min_stock").notNull().default(5),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    {
      uniqueInventory: uniqueIndex("unique_store_inventory").on(
        table.storeId,
        table.tankTypeId
      ),
    },
  ]
);

// Create Zod schemas for validation
export const insertStoreInventorySchema = createInsertSchema(storeInventory);
export const selectStoreInventorySchema = createSelectSchema(storeInventory);

export type StoreInventory = z.infer<typeof selectStoreInventorySchema>;
export type NewStoreInventory = z.infer<typeof insertStoreInventorySchema>;

export default storeInventory;
