import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

// Define the sudo-admins table
export const superadmins = pgTable("superadmins", {
  sudoadminId: serial("sudoadmin_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  accessLevel: varchar("access_level", { length: 20 }).notNull().default("all"),
  canManageUsers: boolean("can_manage_users").default(false),
  canManageFinances: boolean("can_manage_finances").default(false),
  canManageTransactions: boolean("can_manage_transactions").default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertSudoAdminSchema = createInsertSchema(superadmins);
export const selectSudoAdminSchema = createSelectSchema(superadmins);

export type SudoAdmin = z.infer<typeof selectSudoAdminSchema>;
export type NewSudoAdmin = z.infer<typeof insertSudoAdminSchema>;

export default superadmins;
