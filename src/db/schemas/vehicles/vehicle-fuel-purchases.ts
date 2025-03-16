import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { vehicles } from "./vehicles";
import { users } from "../user-management/users";

export const vehicleFuelPurchases = pgTable("vehicle_fuel_purchases", {
  purchaseId: serial("purchase_id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.vehicleId),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  amountLiters: decimal("amount_liters", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  odometerReading: decimal("odometer_reading", {
    precision: 10,
    scale: 2,
  }).notNull(),
  fuelType: varchar("fuel_type", { length: 20 }).notNull(),
  receiptNumber: varchar("receipt_number", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertVehicleFuelPurchaseSchema =
  createInsertSchema(vehicleFuelPurchases);
export const selectVehicleFuelPurchaseSchema =
  createSelectSchema(vehicleFuelPurchases);

export type VehicleFuelPurchase = z.infer<
  typeof selectVehicleFuelPurchaseSchema
>;
export type NewVehicleFuelPurchase = z.infer<
  typeof insertVehicleFuelPurchaseSchema
>;

export default vehicleFuelPurchases;
