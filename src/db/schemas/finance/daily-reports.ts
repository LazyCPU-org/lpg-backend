import {
  pgTable,
  serial,
  integer,
  decimal,
  date,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { users } from "../user-management/users";

export const dailyReports = pgTable(
  "daily_reports",
  {
    reportId: serial("report_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    reportDate: date("report_date").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.userId),
    totalSales: decimal("total_sales", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    cashSales: decimal("cash_sales", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    digitalSales: decimal("digital_sales", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    totalExpenses: decimal("total_expenses", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    tanksSold: integer("tanks_sold").notNull().default(0),
    accessoriesSold: integer("accessories_sold").notNull().default(0),
    pendingOrders: integer("pending_orders").notNull().default(0),
    notes: text("notes"),
    isClosed: boolean("is_closed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_daily_report").on(table.storeId, table.reportDate),
  ]
);

// Create Zod schemas for validation
export const insertDailyReportSchema = createInsertSchema(dailyReports);
export const selectDailyReportSchema = createSelectSchema(dailyReports);

export type DailyReport = z.infer<typeof selectDailyReportSchema>;
export type NewDailyReport = z.infer<typeof insertDailyReportSchema>;

export default dailyReports;
