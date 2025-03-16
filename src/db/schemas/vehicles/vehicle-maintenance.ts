import {
  pgTable,
  serial,
  integer,
  varchar,
  date,
  decimal,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { vehicles } from "./vehicles";

export const vehicleMaintenance = pgTable("vehicle_maintenance", {
  maintenanceId: serial("maintenance_id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.vehicleId),
  maintenanceDate: date("maintenance_date").notNull(),
  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  nextMaintenanceDate: date("next_maintenance_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertVehicleMaintenanceSchema =
  createInsertSchema(vehicleMaintenance);
export const selectVehicleMaintenanceSchema =
  createSelectSchema(vehicleMaintenance);

export type VehicleMaintenance = z.infer<typeof selectVehicleMaintenanceSchema>;
export type NewVehicleMaintenance = z.infer<
  typeof insertVehicleMaintenanceSchema
>;

export default vehicleMaintenance;
