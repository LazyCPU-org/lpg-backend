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

// Tank Return Strategy: Customer returns tanks (specify full or empty)
export class TankReturnStrategy extends TankTransactionStrategy {
  async validateRequest(request: TankTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.RETURN) {
      throw new Error("Invalid transaction type for Return strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Return quantity must be positive");
    }

    if (!request.tankType || !["full", "empty"].includes(request.tankType)) {
      throw new Error("Tank type must be specified for returns: 'full' or 'empty'");
    }
  }

  calculateChanges(request: TankTransactionRequest): TankTransactionChanges {
    // Return: Add the returned tanks to appropriate category
    if (request.tankType === "full") {
      return {
        fullTanksChange: request.quantity,
        emptyTanksChange: 0,
      };
    } else {
      return {
        fullTanksChange: 0,
        emptyTanksChange: request.quantity,
      };
    }
  }

  async execute(request: TankTransactionRequest, skipValidation = false): Promise<TankTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }
      
      const changes = this.calculateChanges(request);

      // Add the returned tanks
      await this.inventoryTransactionRepository.incrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        changes.fullTanksChange,
        changes.emptyTanksChange,
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Devolución de tanques ${request.tankType === "full" ? "llenos" : "vacíos"}`,
        request.referenceId
      );

      // Get updated quantities
      const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        request.inventoryId,
        request.tankTypeId
      );

      return {
        success: true,
        message: `Devolución de ${request.quantity} tanque(s) ${request.tankType === "full" ? "llenos" : "vacíos"} registrada exitosamente`,
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
      throw new InternalError(`Error procesando devolución de tanques: ${error}`);
    }
  }
}

// Item Return Strategy: Customer returns items (increase inventory)
export class ItemReturnStrategy extends ItemTransactionStrategy {
  async validateRequest(request: ItemTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.RETURN) {
      throw new Error("Invalid transaction type for Return strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Return quantity must be positive");
    }
  }

  calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges {
    // Return: Increase item count
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
        `${request.notes || ''} - Devolución de artículos`
      );

      // Get updated quantity
      const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        request.inventoryId,
        request.inventoryItemId
      );

      return {
        success: true,
        message: `Devolución de ${request.quantity} artículo(s) registrada exitosamente`,
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
      throw new InternalError(`Error procesando devolución de artículos: ${error}`);
    }
  }
}