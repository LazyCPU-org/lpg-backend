import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

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

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    relationName: "user",
    fields: [userProfiles.userId],
    references: [users.userId],
  }),
}));

// Resolve circular dependency by importing after defining the relations
import { users } from ".";

export default userProfiles;
