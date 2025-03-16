import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";

export const auditLogs = pgTable("audit_logs", {
  logId: serial("log_id").primaryKey(),
  userId: integer("user_id").references(() => users.userId),
  action: varchar("action", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: integer("record_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create Zod schemas for validation
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);

export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type NewAuditLog = z.infer<typeof insertAuditLogSchema>;

export default auditLogs;
