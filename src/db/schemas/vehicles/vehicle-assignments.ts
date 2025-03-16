import {
  pgTable,
  serial,
  integer,
  date,
  decimal,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { vehicles } from "./vehicles";
import { users } from "../user-management/users";

export const vehicleAssignments = pgTable("vehicle_assignments", {
  assignmentId: serial("assignment_id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .notNull()
    .references(() => vehicles.vehicleId),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  assignmentDate: date("assignment_date").notNull(),
  returnDate: date("return_date"),
  initialMileage: decimal("initial_mileage", { precision: 10, scale: 2 }),
  finalMileage: decimal("final_mileage", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertVehicleAssignmentSchema =
  createInsertSchema(vehicleAssignments);
export const selectVehicleAssignmentSchema =
  createSelectSchema(vehicleAssignments);

export type VehicleAssignment = z.infer<typeof selectVehicleAssignmentSchema>;
export type NewVehicleAssignment = z.infer<
  typeof insertVehicleAssignmentSchema
>;

export default vehicleAssignments;
