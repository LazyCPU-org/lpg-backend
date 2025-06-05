import { TransactionType } from "./transactionTypes";

export abstract class IInventoryTransactionRepository {
  // Tank transaction methods
  abstract incrementTankQuantity(
    assignmentTankId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void>;

  abstract decrementTankQuantity(
    assignmentTankId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void>;

  // Item transaction methods
  abstract incrementItemQuantity(
    inventoryAssignmentItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void>;

  abstract decrementItemQuantity(
    inventoryAssignmentItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void>;

  // Convenience methods that work with inventoryId (find assignments first)
  abstract incrementTankByInventoryId(
    inventoryId: number,
    tankTypeId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void>;

  abstract decrementTankByInventoryId(
    inventoryId: number,
    tankTypeId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void>;

  abstract incrementItemByInventoryId(
    inventoryId: number,
    inventoryItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void>;

  abstract decrementItemByInventoryId(
    inventoryId: number,
    inventoryItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void>;

  // Batch operations for API convenience
  abstract processTankTransactions(
    inventoryId: number,
    transactions: {
      tankTypeId: number;
      fullTanksChange: number;
      emptyTanksChange: number;
      transactionType: TransactionType;
      userId: number;
      notes?: string;
      referenceId?: number;
    }[],
    useDbTransaction?: boolean
  ): Promise<void>;

  abstract processItemTransactions(
    inventoryId: number,
    transactions: {
      inventoryItemId: number;
      itemChange: number;
      transactionType: TransactionType;
      userId: number;
      notes?: string;
    }[],
    useDbTransaction?: boolean
  ): Promise<void>;

  // Get current quantities (calculated from your assignment tables)
  abstract getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<{
    currentFullTanks: number;
    currentEmptyTanks: number;
  }>;

  abstract getCurrentItemQuantity(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<{
    currentItems: number;
  }>;
}
