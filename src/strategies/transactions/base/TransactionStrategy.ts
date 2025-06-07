import { 
  TransactionRequest, 
  TankTransactionChanges, 
  ItemTransactionChanges,
  TankTransactionRequest,
  ItemTransactionRequest
} from "./TransactionRequest";
import { TransactionResult } from "./TransactionResult";
import { IInventoryTransactionRepository } from "../../../repositories/inventory";

export abstract class TransactionStrategy {
  constructor(
    protected readonly inventoryTransactionRepository: IInventoryTransactionRepository
  ) {}

  // Validate the transaction request
  abstract validateRequest(request: TransactionRequest): Promise<void>;

  // Calculate the changes to apply to inventory
  abstract calculateChanges(request: TransactionRequest): TankTransactionChanges | ItemTransactionChanges;

  // Execute the transaction with optional validation skip
  abstract execute(request: TransactionRequest, skipValidation?: boolean): Promise<TransactionResult>;

  // Helper method to determine if request is for tanks or items
  protected isTankTransaction(request: TransactionRequest): request is TankTransactionRequest {
    return 'tankTypeId' in request;
  }

  protected isItemTransaction(request: TransactionRequest): request is ItemTransactionRequest {
    return 'inventoryItemId' in request;
  }
}

// Abstract base classes for specific transaction entity types
export abstract class TankTransactionStrategy extends TransactionStrategy {
  abstract validateRequest(request: TankTransactionRequest): Promise<void>;
  abstract calculateChanges(request: TankTransactionRequest): TankTransactionChanges;
  abstract execute(request: TankTransactionRequest, skipValidation?: boolean): Promise<TransactionResult>;
}

export abstract class ItemTransactionStrategy extends TransactionStrategy {
  abstract validateRequest(request: ItemTransactionRequest): Promise<void>;
  abstract calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges;
  abstract execute(request: ItemTransactionRequest, skipValidation?: boolean): Promise<TransactionResult>;
}