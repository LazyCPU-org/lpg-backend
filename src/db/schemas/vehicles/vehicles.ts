import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";

// Define vehicle status enum values
export const VehicleStatusEnum = {
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE: "maintenance",
} as const;

export const vehicles = pgTable(
  "vehicles",
  {
    vehicleId: serial("vehicle_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    model: varchar("model", { length: 50 }).notNull(),
    plateNumber: varchar("plate_number", { length: 20 }).notNull().unique(),
    vehicleType: varchar("vehicle_type", { length: 20 }).notNull(),
    maxCapacity: integer("max_capacity").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "vehicle_status_check",
      sql`${table.status} IN ('${sql.raw(
        VehicleStatusEnum.AVAILABLE
      )}', '${sql.raw(VehicleStatusEnum.IN_USE)}', '${sql.raw(
        VehicleStatusEnum.MAINTENANCE
      )}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertVehicleSchema = createInsertSchema(vehicles, {
  status: z.enum([
    VehicleStatusEnum.AVAILABLE,
    VehicleStatusEnum.IN_USE,
    VehicleStatusEnum.MAINTENANCE,
  ]),
});

export const selectVehicleSchema = createSelectSchema(vehicles, {
  status: z.enum([
    VehicleStatusEnum.AVAILABLE,
    VehicleStatusEnum.IN_USE,
    VehicleStatusEnum.MAINTENANCE,
  ]),
});

export type Vehicle = z.infer<typeof selectVehicleSchema>;
export type NewVehicle = z.infer<typeof insertVehicleSchema>;

export default vehicles;
