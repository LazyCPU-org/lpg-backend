import { z } from "zod";
import { TransactionTypeEnum, TransactionType } from "../../db/schemas/inventory/item-transactions";

/**
 * Simplified Transaction DTOs - Business Logic Aware
 * 
 * These DTOs use the new strategy pattern and only require:
 * - Entity ID (tankTypeId or inventoryItemId)
 * - Transaction type
 * - Quantity (business logic handles the rest)
 * - Optional metadata
 */

// Base simplified transaction schema
const BaseSimplifiedTransactionSchema = z.object({
  transactionType: z.enum([
    TransactionTypeEnum.PURCHASE,
    TransactionTypeEnum.SALE,
    TransactionTypeEnum.RETURN,
    TransactionTypeEnum.TRANSFER,
    TransactionTypeEnum.ASSIGNMENT,
  ], {
    errorMap: () => ({ message: "Tipo de transacción inválido" }),
  }),
  quantity: z.number().int().positive("La cantidad debe ser un número positivo"),
  notes: z.string().optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedTankTransaction:
 *       type: object
 *       properties:
 *         tankTypeId:
 *           type: integer
 *           description: ID of the tank type
 *         transactionType:
 *           type: string
 *           enum: [purchase, sale, return, transfer, assignment]
 *           description: Type of transaction
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Number of tanks (business logic handles full/empty exchange)
 *         tankType:
 *           type: string
 *           enum: [full, empty]
 *           description: Required for RETURN, TRANSFER, and ASSIGNMENT transactions
 *         targetStoreAssignmentId:
 *           type: integer
 *           description: Required for TRANSFER transactions
 *         notes:
 *           type: string
 *           description: Additional notes
 *         referenceId:
 *           type: integer
 *           description: External reference ID
 *       required:
 *         - tankTypeId
 *         - transactionType
 *         - quantity
 */
export const SimplifiedTankTransactionSchema = BaseSimplifiedTransactionSchema.extend({
  tankTypeId: z.number().positive("ID de tipo de tanque inválido"),
  tankType: z.enum(["full", "empty"]).optional(),
  targetStoreAssignmentId: z.number().positive().optional(),
  referenceId: z.number().positive().optional(),
}).refine((data) => {
  // tankType is required for RETURN, TRANSFER, and ASSIGNMENT
  const requiresTankType = data.transactionType === TransactionTypeEnum.RETURN ||
                          data.transactionType === TransactionTypeEnum.TRANSFER ||
                          data.transactionType === TransactionTypeEnum.ASSIGNMENT;
  
  if (requiresTankType && !data.tankType) {
    return false;
  }
  
  // targetStoreAssignmentId is required for TRANSFER
  if (data.transactionType === TransactionTypeEnum.TRANSFER && !data.targetStoreAssignmentId) {
    return false;
  }
  
  return true;
}, {
  message: "tankType es requerido para RETURN, TRANSFER y ASSIGNMENT. targetStoreAssignmentId es requerido para TRANSFER.",
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedItemTransaction:
 *       type: object
 *       properties:
 *         inventoryItemId:
 *           type: integer
 *           description: ID of the inventory item
 *         transactionType:
 *           type: string
 *           enum: [purchase, sale, return, transfer, assignment]
 *           description: Type of transaction
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Number of items
 *         targetStoreAssignmentId:
 *           type: integer
 *           description: Required for TRANSFER transactions
 *         notes:
 *           type: string
 *           description: Additional notes
 *       required:
 *         - inventoryItemId
 *         - transactionType
 *         - quantity
 */
export const SimplifiedItemTransactionSchema = BaseSimplifiedTransactionSchema.extend({
  inventoryItemId: z.number().positive("ID de artículo inválido"),
  targetStoreAssignmentId: z.number().positive().optional(),
}).refine((data) => {
  // targetStoreAssignmentId is required for TRANSFER
  if (data.transactionType === TransactionTypeEnum.TRANSFER && !data.targetStoreAssignmentId) {
    return false;
  }
  
  return true;
}, {
  message: "targetStoreAssignmentId es requerido para transacciones TRANSFER.",
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedTankTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/SimplifiedTankTransaction'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const SimplifiedTankTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: SimplifiedTankTransactionSchema,
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedItemTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/SimplifiedItemTransaction'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const SimplifiedItemTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: SimplifiedItemTransactionSchema,
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedBatchTankTransactionsRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SimplifiedTankTransaction'
 *           minItems: 1
 *           description: List of tank transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const SimplifiedBatchTankTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(SimplifiedTankTransactionSchema).min(1, "Debe incluir al menos una transacción"),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     SimplifiedBatchItemTransactionsRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SimplifiedItemTransaction'
 *           minItems: 1
 *           description: List of item transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const SimplifiedBatchItemTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(SimplifiedItemTransactionSchema).min(1, "Debe incluir al menos una transacción"),
});

// Export types
export type SimplifiedTankTransaction = z.infer<typeof SimplifiedTankTransactionSchema>;
export type SimplifiedItemTransaction = z.infer<typeof SimplifiedItemTransactionSchema>;
export type SimplifiedTankTransactionRequest = z.infer<typeof SimplifiedTankTransactionRequestSchema>;
export type SimplifiedItemTransactionRequest = z.infer<typeof SimplifiedItemTransactionRequestSchema>;
export type SimplifiedBatchTankTransactionsRequest = z.infer<typeof SimplifiedBatchTankTransactionsRequestSchema>;
export type SimplifiedBatchItemTransactionsRequest = z.infer<typeof SimplifiedBatchItemTransactionsRequestSchema>;

// Helper to convert simplified DTO to strategy request
export function convertTankTransactionToStrategyRequest(
  inventoryId: number,
  transaction: SimplifiedTankTransaction,
  userId: number
) {
  return {
    inventoryId,
    tankTypeId: transaction.tankTypeId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    tankType: transaction.tankType,
    targetStoreAssignmentId: transaction.targetStoreAssignmentId,
    referenceId: transaction.referenceId,
    notes: transaction.notes,
    userId,
  };
}

export function convertItemTransactionToStrategyRequest(
  inventoryId: number,
  transaction: SimplifiedItemTransaction,
  userId: number
) {
  return {
    inventoryId,
    inventoryItemId: transaction.inventoryItemId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    targetStoreAssignmentId: transaction.targetStoreAssignmentId,
    notes: transaction.notes,
    userId,
  };
}