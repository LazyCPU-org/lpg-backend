import { z } from "zod";
import { TransactionTypeEnum } from "../../db/schemas/inventory/item-transactions";

/**
 * @openapi
 * components:
 *   schemas:
 *     TankTransactionRequest:
 *       type: object
 *       properties:
 *         tankTypeId:
 *           type: integer
 *           description: ID of the tank type
 *         fullTanksChange:
 *           type: integer
 *           description: Change in full tanks quantity (positive for increment, negative for decrement)
 *         emptyTanksChange:
 *           type: integer
 *           description: Change in empty tanks quantity (positive for increment, negative for decrement)
 *         transactionType:
 *           type: string
 *           enum: [purchase, sale, return, transfer, assignment]
 *           description: Type of transaction
 *         notes:
 *           type: string
 *           description: Additional notes for the transaction
 *         referenceId:
 *           type: integer
 *           description: Reference ID for external systems (optional)
 *       required:
 *         - tankTypeId
 *         - fullTanksChange
 *         - emptyTanksChange
 *         - transactionType
 */
export const TankTransactionRequestSchema = z.object({
  tankTypeId: z.number().positive("ID de tipo de tanque inválido"),
  fullTanksChange: z.number().int("Cambio de tanques llenos debe ser un entero"),
  emptyTanksChange: z.number().int("Cambio de tanques vacíos debe ser un entero"),
  transactionType: z.enum([
    TransactionTypeEnum.PURCHASE,
    TransactionTypeEnum.SALE, 
    TransactionTypeEnum.RETURN,
    TransactionTypeEnum.TRANSFER,
    TransactionTypeEnum.ASSIGNMENT,
  ], {
    errorMap: () => ({ message: "Tipo de transacción inválido" }),
  }),
  notes: z.string().optional(),
  referenceId: z.number().positive().optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     ItemTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryItemId:
 *           type: integer
 *           description: ID of the inventory item
 *         itemChange:
 *           type: integer
 *           description: Change in item quantity (positive for increment, negative for decrement)
 *         transactionType:
 *           type: string
 *           enum: [purchase, sale, return, transfer, assignment]
 *           description: Type of transaction
 *         notes:
 *           type: string
 *           description: Additional notes for the transaction
 *       required:
 *         - inventoryItemId
 *         - itemChange
 *         - transactionType
 */
export const ItemTransactionRequestSchema = z.object({
  inventoryItemId: z.number().positive("ID de artículo inválido"),
  itemChange: z.number().int("Cambio de artículos debe ser un entero"),
  transactionType: z.enum([
    TransactionTypeEnum.PURCHASE,
    TransactionTypeEnum.SALE,
    TransactionTypeEnum.RETURN,
    TransactionTypeEnum.TRANSFER,
    TransactionTypeEnum.ASSIGNMENT,
  ], {
    errorMap: () => ({ message: "Tipo de transacción inválido" }),
  }),
  notes: z.string().optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTankTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/TankTransactionRequest'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const CreateTankTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: TankTransactionRequestSchema,
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateItemTransactionRequest:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         transaction:
 *           $ref: '#/components/schemas/ItemTransactionRequest'
 *       required:
 *         - inventoryId
 *         - transaction
 */
export const CreateItemTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transaction: ItemTransactionRequestSchema,
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
 *             $ref: '#/components/schemas/TankTransactionRequest'
 *           description: List of tank transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const BatchTankTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(TankTransactionRequestSchema).min(1, "Debe incluir al menos una transacción"),
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
 *             $ref: '#/components/schemas/ItemTransactionRequest'
 *           description: List of item transactions to process
 *       required:
 *         - inventoryId
 *         - transactions
 */
export const BatchItemTransactionsRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  transactions: z.array(ItemTransactionRequestSchema).min(1, "Debe incluir al menos una transacción"),
});

// Export types
export type TankTransactionRequest = z.infer<typeof TankTransactionRequestSchema>;
export type ItemTransactionRequest = z.infer<typeof ItemTransactionRequestSchema>;
export type CreateTankTransactionRequest = z.infer<typeof CreateTankTransactionRequestSchema>;
export type CreateItemTransactionRequest = z.infer<typeof CreateItemTransactionRequestSchema>;
export type BatchTankTransactionsRequest = z.infer<typeof BatchTankTransactionsRequestSchema>;
export type BatchItemTransactionsRequest = z.infer<typeof BatchItemTransactionsRequestSchema>;