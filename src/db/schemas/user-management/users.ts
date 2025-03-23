import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { UserRoleEnum } from "../../../config/roles";

// Define the users table
export const users = pgTable(
  "users",
  {
    userId: serial("user_id").primaryKey(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    check(
      "user_role_check1",
      sql`${table.role} IN ('${sql.raw(UserRoleEnum.SUPERADMIN)}', '${sql.raw(
        UserRoleEnum.ADMIN
      )}', '${sql.raw(UserRoleEnum.OPERATOR)}', '${sql.raw(
        UserRoleEnum.DELIVERY
      )}')`
    ),
  ]
);

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
