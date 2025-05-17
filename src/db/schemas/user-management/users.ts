import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Define the users table
export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: rolesEnum().notNull().default("delivery"),
  isVerified: boolean("is_verified").default(false),
  permissions: varchar("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  status: statusEnum().notNull().default("pending"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  userProfiles: one(userProfiles),
  storeAssignments: many(storeAssignments),
}));

// Resolve circular dependency by importing after defining the relations
import { storeAssignments } from "../locations";
import { rolesEnum, statusEnum, userProfiles } from ".";

export default users;
