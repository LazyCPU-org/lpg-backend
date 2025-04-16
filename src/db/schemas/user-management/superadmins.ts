import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { sql } from "drizzle-orm";

// Define the sudo-admins table
export const superadmins = pgTable("superadmins", {
  sudoadminId: serial("sudoadmin_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  permissions: varchar("permissions")
    .array()
    .notNull()
    .default(sql`'{*}'::text[]`),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export default superadmins;
