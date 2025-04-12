import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "../user-management/users";
import assignmentItems from "./inventory-assignments-items";
import { TransactionTypeEnum } from "./item-transactions";

const tankTransactionTypeEnum = pgEnum("tank_transaction_type", [
  TransactionTypeEnum.PURCHASE,
  TransactionTypeEnum.SALE,
  TransactionTypeEnum.RETURN,
  TransactionTypeEnum.TRANSFER,
  TransactionTypeEnum.ASSIGNMENT,
]);

// Define the inventory transactions table
export const tankTransactions = pgTable("tank_transactions", {
  transactionId: serial("transaction_id").primaryKey(),
  assignentItemId: integer("assignent_item_id")
    .notNull()
    .references(() => assignmentItems.assignentItemId),
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
