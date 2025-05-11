import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

// Define the user profiles table
export const userProfiles = pgTable("user_profiles", {
  profileId: serial("profile_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 15 }).notNull(),
  address: text("address"),
  entryDate: date("entry_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const selectUserProfileSchema = createSelectSchema(userProfiles);

export type UserProfile = z.infer<typeof selectUserProfileSchema>;
export type NewUserProfile = z.infer<typeof insertUserProfileSchema>;

export default userProfiles;
