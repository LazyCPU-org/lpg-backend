import { relations } from "drizzle-orm";
import {
  decimal,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Define the stores table
export const stores = pgTable("stores", {
  storeId: serial("store_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  mapsUrl: text("mapsUrl"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  phoneNumber: varchar("phone_number", { length: 15 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const storesRelations = relations(stores, ({ many }) => ({
  assignedUsers: many(storeAssignments),
  tanksCatalog: many(storeCatalogTanks),
  itemsCatalog: many(storeCatalogItems),
}));

// Resolve circular dependency by importing after defining the relations
import { storeAssignments, storeCatalogItems, storeCatalogTanks } from ".";

export default stores;
