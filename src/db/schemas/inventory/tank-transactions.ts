import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";
import { assignmentTanks } from "./inventory-assignments-tanks";
import { TransactionTypeEnum } from "./item-transactions";

export const tankTransactionTypeEnum = pgEnum("tank_transaction_type", [
  TransactionTypeEnum.PURCHASE,
  TransactionTypeEnum.SALE,
  TransactionTypeEnum.RETURN,
  TransactionTypeEnum.TRANSFER,
  TransactionTypeEnum.ASSIGNMENT,
]);

// Define the inventory transactions table
export const tankTransactions = pgTable("tank_transactions", {
  transactionId: serial("transaction_id").primaryKey(),
  assignmentTankId: integer("assignment_tank_id")
    .notNull()
    .references(() => assignmentTanks.assignmentTankId),
  transactionType: tankTransactionTypeEnum().default(TransactionTypeEnum.SALE),
  fullTanksChange: integer("full_tanks_change").notNull().default(0),
  emptyTanksChange: integer("empty_tanks_change").notNull().default(0),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  transactionDate: timestamp("transaction_date").defaultNow(),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const tankTransactionsRelations = relations(
  tankTransactions,
  ({ one }) => ({
    assignmentTank: one(assignmentTanks, {
      fields: [tankTransactions.assignmentTankId],
      references: [assignmentTanks.assignmentTankId],
    }),
    user: one(users, {
      fields: [tankTransactions.userId],
      references: [users.userId],
    }),
  })
);

// Create Zod schemas for validation
export const insertInventoryTransactionSchema = createInsertSchema(
  tankTransactions,
  {
    transactionType: z.enum([
      TransactionTypeEnum.PURCHASE,
      TransactionTypeEnum.SALE,
      TransactionTypeEnum.RETURN,
      TransactionTypeEnum.TRANSFER,
      TransactionTypeEnum.ASSIGNMENT,
    ]),
  }
);

export const selectInventoryTransactionSchema = createSelectSchema(
  tankTransactions,
  {
    transactionType: z.enum([
      TransactionTypeEnum.PURCHASE,
      TransactionTypeEnum.SALE,
      TransactionTypeEnum.RETURN,
      TransactionTypeEnum.TRANSFER,
      TransactionTypeEnum.ASSIGNMENT,
    ]),
  }
);

export type InventoryTransaction = z.infer<
  typeof selectInventoryTransactionSchema
>;
export type NewInventoryTransaction = z.infer<
  typeof insertInventoryTransactionSchema
>;

export default tankTransactions;
