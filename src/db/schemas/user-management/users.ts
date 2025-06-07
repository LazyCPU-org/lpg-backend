import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { rolesEnum, statusEnum } from "./enums";

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
  userProfile: one(userProfiles, {
    relationName: "userProfile",
    fields: [users.userId],
    references: [userProfiles.userId],
  }),
  storeAssignments: many(storeAssignments),
  // Relations for inventory management
  tankTransactions: many(tankTransactions),
  itemTransactions: many(itemTransactions),
  assignedInventories: many(inventoryAssignments, {
    relationName: "assignedByUser",
  }),
  inventoryStatusChanges: many(inventoryStatusHistory, {
    relationName: "changedByUser",
  }),
}));

// Resolve circular dependency by importing after defining the relations
import { userProfiles } from ".";
import { inventoryStatusHistory } from "../audit";
import { inventoryAssignments } from "../inventory/inventory-assignments";
import { itemTransactions } from "../inventory/item-transactions";
import { tankTransactions } from "../inventory/tank-transactions";
import { storeAssignments } from "../locations";

export default users;
