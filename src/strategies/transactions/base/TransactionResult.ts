// Base transaction result
export interface BaseTransactionResult {
  success: boolean;
  message: string;
  transactionId?: number;
}

// Tank transaction result with current quantities
export interface TankTransactionResult extends BaseTransactionResult {
  currentQuantities: {
    inventoryId: number;
    tankTypeId: number;
    currentFullTanks: number;
    currentEmptyTanks: number;
  };
}

// Item transaction result with current quantity
export interface ItemTransactionResult extends BaseTransactionResult {
  currentQuantity: {
    inventoryId: number;
    inventoryItemId: number;
    currentItems: number;
  };
}

// Transfer-specific result (includes both source and target updates)
export interface TransferTransactionResult extends BaseTransactionResult {
  sourceUpdate: TankTransactionResult | ItemTransactionResult;
  targetUpdate: TankTransactionResult | ItemTransactionResult;
  transferDetails: {
    sourceStoreAssignmentId: number;
    targetStoreAssignmentId: number;
    quantity: number;
  };
}

// Batch processing result
export interface BatchTransactionResult extends BaseTransactionResult {
  processedCount: number;
  totalCount: number;
  failedTransactions?: Array<{
    index: number;
    error: string;
  }>;
}

// Union type for all transaction results
export type TransactionResult = 
  | TankTransactionResult 
  | ItemTransactionResult 
  | TransferTransactionResult 
  | BatchTransactionResult;