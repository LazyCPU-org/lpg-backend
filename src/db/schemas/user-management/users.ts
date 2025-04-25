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
import { UserStatus } from "../../../utils/status";

export const rolesEnum = pgEnum("roles_enum", [
  UserRoleEnum.SUPERADMIN,
  UserRoleEnum.ADMIN,
  UserRoleEnum.OPERATOR,
  UserRoleEnum.DELIVERY,
]);

export const statusEnum = pgEnum("status_enum", [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.PENDING,
  UserStatus.BLOCKED,
]);

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

export default users;
