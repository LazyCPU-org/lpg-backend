import { z } from "zod";
import { TransactionTypeEnum, TransactionType } from "../../db/schemas/inventory/item-transactions";

/**
 * Transaction DTOs - Business Logic Aware
 * 
 * These DTOs use the strategy pattern and only require:
 * - Entity ID (tankTypeId or inventoryItemId)
 * - Transaction type
 * - Quantity (business logic handles the rest)
 * - Optional metadata
 */

// Base transaction schema
const BaseTransactionSchema = z.object({
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
 *     TankTransaction:
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
export const TankTransactionSchema = BaseTransactionSchema.extend({
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
 *     ItemTransaction:
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
export const ItemTransactionSchema = BaseTransactionSchema.extend({
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
 *     TankTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/TankTransaction'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const TankTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: TankTransactionSchema,
});

/**
 * @openapi
 * components:
 *   schemas:
 *     ItemTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/ItemTransaction'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const ItemTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: ItemTransactionSchema,
});

/**
 * @openapi
 * components:
 *   schemas:
 *     BatchTankTransactionsRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TankTransaction'
 *           minItems: 1
 *           description: List of tank transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const BatchTankTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(TankTransactionSchema).min(1, "Debe incluir al menos una transacción"),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     BatchItemTransactionsRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ItemTransaction'
 *           minItems: 1
 *           description: List of item transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const BatchItemTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(ItemTransactionSchema).min(1, "Debe incluir al menos una transacción"),
});

// Export types
export type TankTransaction = z.infer<typeof TankTransactionSchema>;
export type ItemTransaction = z.infer<typeof ItemTransactionSchema>;
export type TankTransactionRequest = z.infer<typeof TankTransactionRequestSchema>;
export type ItemTransactionRequest = z.infer<typeof ItemTransactionRequestSchema>;
export type BatchTankTransactionsRequest = z.infer<typeof BatchTankTransactionsRequestSchema>;
export type BatchItemTransactionsRequest = z.infer<typeof BatchItemTransactionsRequestSchema>;

// Helper to convert simplified DTO to strategy request
export function convertTankTransactionToStrategyRequest(
  inventoryId: number,
  transaction: TankTransaction,
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
  transaction: ItemTransaction,
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