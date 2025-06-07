import { z } from "zod";
import { TransactionTypeEnum, TransactionType } from "../../../db/schemas/inventory/item-transactions";

// Base transaction request
export interface BaseTransactionRequest {
  inventoryId: number;
  transactionType: TransactionType;
  quantity: number;
  notes?: string;
  userId: number;
}

// Tank-specific transaction request
export interface TankTransactionRequest extends BaseTransactionRequest {
  tankTypeId: number;
  tankType?: "full" | "empty"; // For transfers and returns
  targetStoreAssignmentId?: number; // For transfers only
  referenceId?: number;
}

// Item-specific transaction request
export interface ItemTransactionRequest extends BaseTransactionRequest {
  inventoryItemId: number;
  targetStoreAssignmentId?: number; // For transfers only
}

// Return-specific properties
export interface ReturnTransactionRequest extends BaseTransactionRequest {
  returnType: "full" | "empty"; // What type is being returned
}

// Transfer validation context
export interface TransferValidationContext {
  sourceStoreAssignmentId: number;
  targetStoreAssignmentId: number;
}

// Calculated changes for database operations
export interface TankTransactionChanges {
  fullTanksChange: number;
  emptyTanksChange: number;
}

export interface ItemTransactionChanges {
  itemChange: number;
}

// Union type for all transaction requests
export type TransactionRequest = TankTransactionRequest | ItemTransactionRequest;

// Validation schemas
export const BaseTankTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  tankTypeId: z.number().positive("ID de tipo de tanque inválido"),
  transactionType: z.enum([
    TransactionTypeEnum.PURCHASE,
    TransactionTypeEnum.SALE,
    TransactionTypeEnum.RETURN,
    TransactionTypeEnum.TRANSFER,
    TransactionTypeEnum.ASSIGNMENT,
  ]),
  quantity: z.number().int().positive("La cantidad debe ser un número positivo"),
  notes: z.string().optional(),
  referenceId: z.number().positive().optional(),
});

export const BaseItemTransactionRequestSchema = z.object({
  inventoryId: z.number().positive("ID de inventario inválido"),
  inventoryItemId: z.number().positive("ID de artículo inválido"),
  transactionType: z.enum([
    TransactionTypeEnum.PURCHASE,
    TransactionTypeEnum.SALE,
    TransactionTypeEnum.RETURN,
    TransactionTypeEnum.TRANSFER,
    TransactionTypeEnum.ASSIGNMENT,
  ]),
  quantity: z.number().int().positive("La cantidad debe ser un número positivo"),
  notes: z.string().optional(),
});

// Transfer-specific schemas
export const TankTransferRequestSchema = BaseTankTransactionRequestSchema.extend({
  transactionType: z.literal(TransactionTypeEnum.TRANSFER),
  tankType: z.enum(["full", "empty"], {
    errorMap: () => ({ message: "Tipo de tanque debe ser 'full' o 'empty'" }),
  }),
  targetStoreAssignmentId: z.number().positive("ID de tienda destino inválido"),
});

export const ItemTransferRequestSchema = BaseItemTransactionRequestSchema.extend({
  transactionType: z.literal(TransactionTypeEnum.TRANSFER),
  targetStoreAssignmentId: z.number().positive("ID de tienda destino inválido"),
});

// Return-specific schemas
export const TankReturnRequestSchema = BaseTankTransactionRequestSchema.extend({
  transactionType: z.literal(TransactionTypeEnum.RETURN),
  tankType: z.enum(["full", "empty"], {
    errorMap: () => ({ message: "Tipo de tanque debe ser 'full' o 'empty'" }),
  }),
});

export type SimplifiedTankTransactionRequest = z.infer<typeof BaseTankTransactionRequestSchema>;
export type SimplifiedItemTransactionRequest = z.infer<typeof BaseItemTransactionRequestSchema>;
export type TankTransferRequest = z.infer<typeof TankTransferRequestSchema>;
export type ItemTransferRequest = z.infer<typeof ItemTransferRequestSchema>;
export type TankReturnRequest = z.infer<typeof TankReturnRequestSchema>;