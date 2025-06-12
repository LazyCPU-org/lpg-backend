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
import { assignmentTanks } from "./inventory-assignments-tanks";
import { TransactionTypeEnum } from "./transaction-types";

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
    .references(() => assignmentTanks.inventoryAssignmentTankId),
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
  ({ one, many }) => ({
    assignmentTank: one(assignmentTanks, {
      fields: [tankTransactions.assignmentTankId],
      references: [assignmentTanks.inventoryAssignmentTankId],
    }),
    user: one(users, {
      fields: [tankTransactions.userId],
      references: [users.userId],
    }),
    orderTransactionLinks: many(orderTransactionLinks),
  })
);

// Note: Zod schemas moved to DTOs following inventory pattern

export default tankTransactions;

// Import after relations to avoid circular dependency
import { orderTransactionLinks } from "../orders";
