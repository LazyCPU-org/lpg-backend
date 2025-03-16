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

// Define the admins table
export const admins = pgTable("admins", {
  adminId: serial("admin_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  accessLevel: varchar("access_level", { length: 20 })
    .notNull()
    .default("full"),
  canManageUsers: boolean("can_manage_users").default(true),
  canManageFinances: boolean("can_manage_finances").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertAdminSchema = createInsertSchema(admins);
export const selectAdminSchema = createSelectSchema(admins);

export type Admin = z.infer<typeof selectAdminSchema>;
export type NewAdmin = z.infer<typeof insertAdminSchema>;

export default admins;
