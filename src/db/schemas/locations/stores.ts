import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
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
}));

// Resolve circular dependency by importing after defining the relations
import { storeAssignments } from ".";

export default stores;
