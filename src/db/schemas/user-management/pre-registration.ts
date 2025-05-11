import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import users, { rolesEnum } from "./users";

// Initial step when register a new user
export const preRegistration = pgTable("registration_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: rolesEnum().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.userId),
  assignedTo: integer("assigned_to").references(() => users.userId),
});

export default preRegistration;
