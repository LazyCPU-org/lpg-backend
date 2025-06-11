/**
 * Transaction Response Interfaces
 * 
 * These interfaces provide clean, business-oriented responses
 * that hide implementation details from the API consumers
 */

// Base transaction response
export interface BaseTransactionResponse {
  success: boolean;
  message: string;
  transactionId?: number;
  timestamp?: string;
}

// Tank transaction response with current quantities
export interface TankTransactionResponse extends BaseTransactionResponse {
  inventory: {
    inventoryId: number;
    tankType: {
      tankTypeId: number;
      name?: string;
    };
    quantities: {
      fullTanks: number;
      emptyTanks: number;
      totalTanks: number;
    };
  };
}

// Item transaction response with current quantity
export interface ItemTransactionResponse extends BaseTransactionResponse {
  inventory: {
    inventoryId: number;
    item: {
      inventoryItemId: number;
      name?: string;
    };
    quantity: {
      currentItems: number;
    };
  };
}

// Transfer-specific response (includes both source and target)
export interface TransferTransactionResponse extends BaseTransactionResponse {
  transfer: {
    sourceStoreAssignmentId: number;
    targetStoreAssignmentId: number;
    quantity: number;
    entityType: "tank" | "item";
    tankType?: "full" | "empty"; // Only for tank transfers
  };
  sourceInventory: TankTransactionResponse | ItemTransactionResponse;
  targetInventory: TankTransactionResponse | ItemTransactionResponse;
}

// Batch processing response
export interface BatchTransactionResponse extends BaseTransactionResponse {
  batch: {
    totalRequested: number;
    successfullyProcessed: number;
    failed: number;
  };
  results: Array<TankTransactionResponse | ItemTransactionResponse>;
  failures?: Array<{
    index: number;
    error: string;
    transaction: any; // The failed transaction data
  }>;
}

// Transaction validation response
export interface TransactionValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  calculatedChanges?: {
    fullTanksChange?: number;
    emptyTanksChange?: number;
    itemChange?: number;
  };
}

// Business insights for transaction types
export interface TransactionTypeInfo {
  transactionType: string;
  description: string;
  businessLogic: string;
  requiredFields: string[];
  examples: {
    description: string;
    example: any;
  }[];
}

// Available transaction types for entity
export interface SupportedTransactionsResponse {
  entityType: "tank" | "item";
  supportedTransactions: TransactionTypeInfo[];
}

// Union type for all transaction responses
export type TransactionResponse = 
  | TankTransactionResponse 
  | ItemTransactionResponse 
  | TransferTransactionResponse 
  | BatchTransactionResponse;