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
import { assignmentItems } from "./inventory-assignments-items";

// Define the transaction type enum values
export const TransactionTypeEnum = {
  PURCHASE: "purchase", // The user makes a purchase from a provider to replenish their inventory in that moment
  SALE: "sale", // The transaction is created due to a new sale
  RETURN: "return", // The user made a sale and got an item in return (used for tanks)
  TRANSFER: "transfer", // The user made a transfer of items to another inventory
  ASSIGNMENT: "assignment", // When a superior requested a purchase for their own and then assigned that to a user. Happens when the user starts working and don't have any inventory at all (base state).
} as const;

export const itemTransactionTypeEnum = pgEnum("item_transaction_type", [
  TransactionTypeEnum.PURCHASE,
  TransactionTypeEnum.SALE,
  TransactionTypeEnum.RETURN,
  TransactionTypeEnum.TRANSFER,
  TransactionTypeEnum.ASSIGNMENT,
]);

// Define the inventory transactions table
export const itemTransactions = pgTable("item_transactions", {
  itemTransactionId: serial("item_transaction_id").primaryKey(),
  assignmentItemId: integer("assignment_item_id")
    .notNull()
    .references(() => assignmentItems.inventoryAssignmentItemId),
  transactionType: itemTransactionTypeEnum().default(TransactionTypeEnum.SALE),
  itemChange: integer("item_change").notNull().default(0),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId),
  transactionDate: timestamp("transaction_date").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const itemTransactionsRelations = relations(
  itemTransactions,
  ({ one }) => ({
    assignmentItem: one(assignmentItems, {
      fields: [itemTransactions.assignmentItemId],
      references: [assignmentItems.inventoryAssignmentItemId],
    }),
    user: one(users, {
      fields: [itemTransactions.userId],
      references: [users.userId],
    }),
  })
);

// Create Zod schemas for validation
export const insertInventoryTransactionSchema = createInsertSchema(
  itemTransactions,
  {
    transactionType: z.enum([
      TransactionTypeEnum.PURCHASE,
      TransactionTypeEnum.SALE,
      TransactionTypeEnum.TRANSFER,
      TransactionTypeEnum.ASSIGNMENT,
    ]),
  }
);

export const selectInventoryTransactionSchema = createSelectSchema(
  itemTransactions,
  {
    transactionType: z.enum([
      TransactionTypeEnum.PURCHASE,
      TransactionTypeEnum.SALE,
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

export default itemTransactions;
