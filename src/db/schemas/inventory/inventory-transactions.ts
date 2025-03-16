import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { stores } from "../locations/stores";
import { tankTypes } from "./tank-types";
import { users } from "../user-management/users";
import { sql } from "drizzle-orm";

// Define the transaction type enum values
export const TransactionTypeEnum = {
  PURCHASE: "purchase",
  SALE: "sale",
  RETURN: "return",
  TRANSFER: "transfer",
  ASSIGNMENT: "assignment",
} as const;

// Define the inventory transactions table
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    transactionId: serial("transaction_id").primaryKey(),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.storeId),
    tankTypeId: integer("tank_type_id")
      .notNull()
      .references(() => tankTypes.typeId),
    transactionType: varchar("transaction_type", { length: 20 }).notNull(),
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
  },
  (table) => [
    check(
      "transac_type1",
      sql`${table.transactionType} IN ('${sql.raw(
        TransactionTypeEnum.PURCHASE
      )}', '${sql.raw(TransactionTypeEnum.SALE)}', '${sql.raw(
        TransactionTypeEnum.RETURN
      )}', '${sql.raw(TransactionTypeEnum.TRANSFER)}', '${sql.raw(
        TransactionTypeEnum.ASSIGNMENT
      )}')`
    ),
  ]
);

// Create Zod schemas for validation
export const insertInventoryTransactionSchema = createInsertSchema(
  inventoryTransactions,
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
  inventoryTransactions,
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

export default inventoryTransactions;
