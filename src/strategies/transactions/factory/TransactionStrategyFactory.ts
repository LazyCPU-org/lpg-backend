import { TransactionStrategy } from "../base/TransactionStrategy";
import { TransactionRequest, TankTransactionRequest, ItemTransactionRequest } from "../base/TransactionRequest";
import { TransactionTypeEnum, TransactionType } from "../../../db/schemas/inventory/item-transactions";
import { IInventoryTransactionRepository } from "../../../repositories/inventory";

// Tank strategies
import { TankSaleStrategy } from "../implementations/SaleTransactionStrategy";
import { TankPurchaseStrategy } from "../implementations/PurchaseTransactionStrategy";
import { TankReturnStrategy } from "../implementations/ReturnTransactionStrategy";
import { TankTransferStrategy } from "../implementations/TransferTransactionStrategy";
import { TankAssignmentStrategy } from "../implementations/AssignmentTransactionStrategy";

// Item strategies
import { ItemSaleStrategy } from "../implementations/SaleTransactionStrategy";
import { ItemPurchaseStrategy } from "../implementations/PurchaseTransactionStrategy";
import { ItemReturnStrategy } from "../implementations/ReturnTransactionStrategy";
import { ItemTransferStrategy } from "../implementations/TransferTransactionStrategy";
import { ItemAssignmentStrategy } from "../implementations/AssignmentTransactionStrategy";

export type EntityType = "tank" | "item";

export class TransactionStrategyFactory {
  constructor(
    private readonly inventoryTransactionRepository: IInventoryTransactionRepository
  ) {}

  /**
   * Creates the appropriate transaction strategy based on transaction type and entity type
   */
  create(
    transactionType: TransactionType, 
    entityType: EntityType
  ): TransactionStrategy {
    if (entityType === "tank") {
      return this.createTankStrategy(transactionType);
    } else if (entityType === "item") {
      return this.createItemStrategy(transactionType);
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Creates strategy from a transaction request (auto-detects entity type)
   */
  createFromRequest(request: TransactionRequest): TransactionStrategy {
    const entityType = this.detectEntityType(request);
    return this.create(request.transactionType, entityType);
  }

  /**
   * Detects entity type from transaction request
   */
  private detectEntityType(request: TransactionRequest): EntityType {
    if ('tankTypeId' in request) {
      return "tank";
    } else if ('inventoryItemId' in request) {
      return "item";
    } else {
      throw new Error("Cannot determine entity type from request");
    }
  }

  /**
   * Creates tank-specific transaction strategies
   */
  private createTankStrategy(transactionType: TransactionType): TransactionStrategy {
    switch (transactionType) {
      case TransactionTypeEnum.SALE:
        return new TankSaleStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.PURCHASE:
        return new TankPurchaseStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.RETURN:
        return new TankReturnStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.TRANSFER:
        return new TankTransferStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.ASSIGNMENT:
        return new TankAssignmentStrategy(this.inventoryTransactionRepository);
      
      default:
        throw new Error(`Unsupported tank transaction type: ${transactionType}`);
    }
  }

  /**
   * Creates item-specific transaction strategies
   */
  private createItemStrategy(transactionType: TransactionType): TransactionStrategy {
    switch (transactionType) {
      case TransactionTypeEnum.SALE:
        return new ItemSaleStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.PURCHASE:
        return new ItemPurchaseStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.RETURN:
        return new ItemReturnStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.TRANSFER:
        return new ItemTransferStrategy(this.inventoryTransactionRepository);
      
      case TransactionTypeEnum.ASSIGNMENT:
        return new ItemAssignmentStrategy(this.inventoryTransactionRepository);
      
      default:
        throw new Error(`Unsupported item transaction type: ${transactionType}`);
    }
  }

  /**
   * Lists all supported transaction types for a given entity type
   */
  getSupportedTransactionTypes(entityType: EntityType): TransactionType[] {
    return [
      TransactionTypeEnum.SALE,
      TransactionTypeEnum.PURCHASE,
      TransactionTypeEnum.RETURN,
      TransactionTypeEnum.TRANSFER,
      TransactionTypeEnum.ASSIGNMENT,
    ];
  }

  /**
   * Validates if a transaction type is supported for an entity type
   */
  isTransactionTypeSupported(
    transactionType: TransactionType, 
    entityType: EntityType
  ): boolean {
    return this.getSupportedTransactionTypes(entityType).includes(transactionType);
  }
}