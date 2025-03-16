import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define the stores table
export const stores = pgTable("stores", {
  storeId: serial("store_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  phoneNumber: varchar("phone_number", { length: 15 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertStoreSchema = createInsertSchema(stores);
export const selectStoreSchema = createSelectSchema(stores);

export type Store = z.infer<typeof selectStoreSchema>;
export type NewStore = z.infer<typeof insertStoreSchema>;

export default stores;
