import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "../user-management/users";
import { assignmentItems } from "./inventory-assignments-items";

import { type TransactionType, TransactionTypeEnum } from "./transaction-types";

// Re-export for backward compatibility
export { TransactionType, TransactionTypeEnum };

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
  ({ one, many }) => ({
    assignmentItem: one(assignmentItems, {
      fields: [itemTransactions.assignmentItemId],
      references: [assignmentItems.inventoryAssignmentItemId],
    }),
    user: one(users, {
      fields: [itemTransactions.userId],
      references: [users.userId],
    }),
    orderTransactionLinks: many(orderTransactionLinks),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default itemTransactions;

// Import after relations to avoid circular dependency
import { orderTransactionLinks } from "../orders";
