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

// Tank Sale Strategy: Customer takes full tank, returns empty tank
export class TankSaleStrategy extends TankTransactionStrategy {
  async validateRequest(request: TankTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.SALE) {
      throw new Error("Invalid transaction type for Sale strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Sale quantity must be positive");
    }

    // Validate that inventory has enough full tanks
    const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
      request.inventoryId,
      request.tankTypeId
    );

    if (currentQuantities.currentFullTanks < request.quantity) {
      throw new Error(`Insufficient full tanks. Available: ${currentQuantities.currentFullTanks}, Requested: ${request.quantity}`);
    }
  }

  calculateChanges(request: TankTransactionRequest): TankTransactionChanges {
    // Sale: Customer takes full tanks (-), returns empty tanks (+)
    return {
      fullTanksChange: -request.quantity,
      emptyTanksChange: request.quantity,
    };
  }

  async execute(request: TankTransactionRequest, skipValidation = false): Promise<TankTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }
      
      const changes = this.calculateChanges(request);

      // Execute the transaction using decrement (negative values handled by service)
      await this.inventoryTransactionRepository.decrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        request.quantity, // full tanks to reduce
        0, // no empty tanks to reduce
        request.transactionType,
        request.userId,
        request.notes,
        request.referenceId
      );

      // Add empty tanks (customer returns)
      await this.inventoryTransactionRepository.incrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        0, // no full tanks to add
        request.quantity, // empty tanks from customer
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Tanques vacíos recibidos`,
        request.referenceId
      );

      // Get updated quantities
      const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        request.inventoryId,
        request.tankTypeId
      );

      return {
        success: true,
        message: `Venta de ${request.quantity} tanque(s) registrada exitosamente`,
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
      throw new InternalError(`Error procesando venta de tanques: ${error}`);
    }
  }
}

// Item Sale Strategy: Simple quantity reduction
export class ItemSaleStrategy extends ItemTransactionStrategy {
  async validateRequest(request: ItemTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.SALE) {
      throw new Error("Invalid transaction type for Sale strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Sale quantity must be positive");
    }

    // Validate that inventory has enough items
    const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
      request.inventoryId,
      request.inventoryItemId
    );

    if (currentQuantity.currentItems < request.quantity) {
      throw new Error(`Insufficient items. Available: ${currentQuantity.currentItems}, Requested: ${request.quantity}`);
    }
  }

  calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges {
    // Sale: Reduce item count
    return {
      itemChange: -request.quantity,
    };
  }

  async execute(request: ItemTransactionRequest, skipValidation = false): Promise<ItemTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      // Execute the transaction
      await this.inventoryTransactionRepository.decrementItemByInventoryId(
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
        message: `Venta de ${request.quantity} artículo(s) registrada exitosamente`,
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
      throw new InternalError(`Error procesando venta de artículos: ${error}`);
    }
  }
}