import {
  pgTable,
  serial,
  integer,
  decimal,
  date,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { operators } from "../user-management/operators";
import { admins } from "../user-management/admins";

export const dailyCashReconciliation = pgTable(
  "daily_cash_reconciliation",
  {
    reconciliationId: serial("reconciliation_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    reconciliationDate: date("reconciliation_date").notNull(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.operatorId),
    startingCash: decimal("starting_cash", {
      precision: 10,
      scale: 2,
    }).notNull(),
    endingCash: decimal("ending_cash", { precision: 10, scale: 2 }).notNull(),
    expectedCash: decimal("expected_cash", {
      precision: 10,
      scale: 2,
    }).notNull(),
    difference: decimal("difference", { precision: 10, scale: 2 }).notNull(),
    approvedBy: integer("approved_by").references(() => admins.adminId),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_reconciliation").on(
      table.storeId,
      table.reconciliationDate
    ),
  ]
);

// Create Zod schemas for validation
export const insertDailyCashReconciliationSchema = createInsertSchema(
  dailyCashReconciliation
);
export const selectDailyCashReconciliationSchema = createSelectSchema(
  dailyCashReconciliation
);

export type DailyCashReconciliation = z.infer<
  typeof selectDailyCashReconciliationSchema
>;
export type NewDailyCashReconciliation = z.infer<
  typeof insertDailyCashReconciliationSchema
>;

export default dailyCashReconciliation;
