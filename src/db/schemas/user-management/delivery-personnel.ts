import {
  pgTable,
  serial,
  integer,
  varchar,
  date,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

// Define the delivery personnel table
export const deliveryPersonnel = pgTable("delivery_personnel", {
  personnelId: serial("personnel_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  licenseNumber: varchar("license_number", { length: 50 }),
  licenseExpiry: date("license_expiry"),
  vehicleTypePreference: varchar("vehicle_type_preference", { length: 20 }),
  totalDeliveries: integer("total_deliveries").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertDeliveryPersonnelSchema =
  createInsertSchema(deliveryPersonnel);
export const selectDeliveryPersonnelSchema =
  createSelectSchema(deliveryPersonnel);

export type DeliveryPersonnel = z.infer<typeof selectDeliveryPersonnelSchema>;
export type NewDeliveryPersonnel = z.infer<
  typeof insertDeliveryPersonnelSchema
>;

export default deliveryPersonnel;
