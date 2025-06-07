import { TankTransactionStrategy, ItemTransactionStrategy } from "../base/TransactionStrategy";
import { 
  TankTransactionRequest, 
  ItemTransactionRequest, 
  TankTransactionChanges, 
  ItemTransactionChanges 
} from "../base/TransactionRequest";
import { TankTransactionResult, ItemTransactionResult } from "../base/TransactionResult";
import { TransactionTypeEnum } from "../../../db/schemas/inventory/item-transactions";
import { NotFoundError, InternalError } from "../../../utils/custom-errors";

// Tank Purchase Strategy: Exchange with supplier (get full tanks, give empty tanks)
export class TankPurchaseStrategy extends TankTransactionStrategy {
  async validateRequest(request: TankTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.PURCHASE) {
      throw new Error("Invalid transaction type for Purchase strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Purchase quantity must be positive");
    }

    // Validate that inventory has enough empty tanks to exchange
    const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
      request.inventoryId,
      request.tankTypeId
    );

    if (currentQuantities.currentEmptyTanks < request.quantity) {
      throw new Error(`Insufficient empty tanks for exchange. Available: ${currentQuantities.currentEmptyTanks}, Required: ${request.quantity}`);
    }
  }

  calculateChanges(request: TankTransactionRequest): TankTransactionChanges {
    // Purchase: Receive full tanks (+), give empty tanks to supplier (-)
    return {
      fullTanksChange: request.quantity,
      emptyTanksChange: -request.quantity,
    };
  }

  async execute(request: TankTransactionRequest, skipValidation = false): Promise<TankTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      // Remove empty tanks (given to supplier)
      await this.inventoryTransactionRepository.decrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        0, // no full tanks to reduce
        request.quantity, // empty tanks given to supplier
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Tanques vacíos entregados al proveedor`,
        request.referenceId
      );

      // Add full tanks (received from supplier)
      await this.inventoryTransactionRepository.incrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        request.quantity, // full tanks received
        0, // no empty tanks received
        request.transactionType,
        request.userId,
        request.notes,
        request.referenceId
      );

      // Get updated quantities
      const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        request.inventoryId,
        request.tankTypeId
      );

      return {
        success: true,
        message: `Compra de ${request.quantity} tanque(s) registrada exitosamente`,
        currentQuantities: {
          inventoryId: request.inventoryId,
          tankTypeId: request.tankTypeId,
          currentFullTanks: currentQuantities.currentFullTanks,
          currentEmptyTanks: currentQuantities.currentEmptyTanks,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando compra de tanques: ${error}`);
    }
  }
}

// Item Purchase Strategy: Simple quantity increase
export class ItemPurchaseStrategy extends ItemTransactionStrategy {
  async validateRequest(request: ItemTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.PURCHASE) {
      throw new Error("Invalid transaction type for Purchase strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Purchase quantity must be positive");
    }
  }

  calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges {
    // Purchase: Increase item count
    return {
      itemChange: request.quantity,
    };
  }

  async execute(request: ItemTransactionRequest, skipValidation = false): Promise<ItemTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      // Execute the transaction
      await this.inventoryTransactionRepository.incrementItemByInventoryId(
        request.inventoryId,
        request.inventoryItemId,
        request.quantity,
        request.transactionType,
        request.userId,
        request.notes
      );

      // Get updated quantity
      const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        request.inventoryId,
        request.inventoryItemId
      );

      return {
        success: true,
        message: `Compra de ${request.quantity} artículo(s) registrada exitosamente`,
        currentQuantity: {
          inventoryId: request.inventoryId,
          inventoryItemId: request.inventoryItemId,
          currentItems: currentQuantity.currentItems,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando compra de artículos: ${error}`);
    }
  }
}