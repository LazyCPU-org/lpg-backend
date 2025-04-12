import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { UserRoleEnum } from "../../../config/roles";

export const rolesEnum = pgEnum("roles_enum", [
  UserRoleEnum.SUPERADMIN,
  UserRoleEnum.ADMIN,
  UserRoleEnum.OPERATOR,
  UserRoleEnum.DELIVERY,
]);

// Define the users table
export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: rolesEnum().default("delivery"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  role: z.enum([
    UserRoleEnum.SUPERADMIN,
    UserRoleEnum.ADMIN,
    UserRoleEnum.OPERATOR,
    UserRoleEnum.DELIVERY,
  ]),
});

export const selectUserSchema = createSelectSchema(users, {
  role: z.enum([
    UserRoleEnum.SUPERADMIN,
    UserRoleEnum.ADMIN,
    UserRoleEnum.OPERATOR,
    UserRoleEnum.DELIVERY,
  ]),
});

export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;

export default users;
