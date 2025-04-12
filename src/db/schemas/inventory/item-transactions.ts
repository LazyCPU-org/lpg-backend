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

// Define the transaction type enum values
export const TransactionTypeEnum = {
  PURCHASE: "compra", // El usuario reabastece su tienda mediante compras al proveedor
  SALE: "venta", // The user made a sale
  RETURN: "return", // The user made a sale and got an item in return (used for tanks)
  TRANSFER: "transfer", // The user made a transfer of items to another location
  ASSIGNMENT: "assignment", // When a superior requested a purchase
} as const;

const itemTransactionTypeEnum = pgEnum("item_transaction_type", [
  TransactionTypeEnum.PURCHASE,
  TransactionTypeEnum.SALE,
  TransactionTypeEnum.TRANSFER,
  TransactionTypeEnum.ASSIGNMENT,
]);

// Define the inventory transactions table
export const itemTransactions = pgTable("item_transactions", {
  itemTransactionId: serial("item_transaction_id").primaryKey(),
  assignentItemId: integer("assignent_item_id")
    .notNull()
    .references(() => assignmentItems.assignentItemId),
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
