import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { UserRoleEnum } from "../../../config/roles";
import { sql } from "drizzle-orm";

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
  role: rolesEnum().notNull().default("delivery"),
  permissions: varchar("permissions")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export default users;
