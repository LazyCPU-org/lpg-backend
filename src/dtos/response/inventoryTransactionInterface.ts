import { TransactionType } from "../../repositories/inventory";

/**
 * @openapi
 * components:
 *   schemas:
 *     TankTransactionResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the transaction was successful
 *         message:
 *           type: string
 *           description: Success or error message
 *         currentQuantities:
 *           type: object
 *           properties:
 *             currentFullTanks:
 *               type: integer
 *               description: Current number of full tanks after transaction
 *             currentEmptyTanks:
 *               type: integer
 *               description: Current number of empty tanks after transaction
 *           required:
 *             - currentFullTanks
 *             - currentEmptyTanks
 *       required:
 *         - success
 *         - message
 */
export interface TankTransactionResult {
  success: boolean;
  message: string;
  currentQuantities?: {
    currentFullTanks: number;
    currentEmptyTanks: number;
  };
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ItemTransactionResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the transaction was successful
 *         message:
 *           type: string
 *           description: Success or error message
 *         currentQuantity:
 *           type: object
 *           properties:
 *             currentItems:
 *               type: integer
 *               description: Current number of items after transaction
 *           required:
 *             - currentItems
 *       required:
 *         - success
 *         - message
 */
export interface ItemTransactionResult {
  success: boolean;
  message: string;
  currentQuantity?: {
    currentItems: number;
  };
}

/**
 * @openapi
 * components:
 *   schemas:
 *     BatchTransactionResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether all transactions were successful
 *         message:
 *           type: string
 *           description: Overall success or error message
 *         processedCount:
 *           type: integer
 *           description: Number of transactions processed successfully
 *         totalCount:
 *           type: integer
 *           description: Total number of transactions attempted
 *       required:
 *         - success
 *         - message
 *         - processedCount
 *         - totalCount
 */
export interface BatchTransactionResult {
  success: boolean;
  message: string;
  processedCount: number;
  totalCount: number;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     CurrentTankQuantities:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         tankTypeId:
 *           type: integer
 *           description: ID of the tank type
 *         currentFullTanks:
 *           type: integer
 *           description: Current number of full tanks
 *         currentEmptyTanks:
 *           type: integer
 *           description: Current number of empty tanks
 *       required:
 *         - inventoryId
 *         - tankTypeId
 *         - currentFullTanks
 *         - currentEmptyTanks
 */
export interface CurrentTankQuantities {
  inventoryId: number;
  tankTypeId: number;
  currentFullTanks: number;
  currentEmptyTanks: number;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     CurrentItemQuantity:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *           description: ID of the inventory assignment
 *         inventoryItemId:
 *           type: integer
 *           description: ID of the inventory item
 *         currentItems:
 *           type: integer
 *           description: Current number of items
 *       required:
 *         - inventoryId
 *         - inventoryItemId
 *         - currentItems
 */
export interface CurrentItemQuantity {
  inventoryId: number;
  inventoryItemId: number;
  currentItems: number;
}

export interface TransactionDetails {
  transactionType: TransactionType;
  notes?: string;
  referenceId?: number;
  userId: number;
  transactionDate: Date;
}