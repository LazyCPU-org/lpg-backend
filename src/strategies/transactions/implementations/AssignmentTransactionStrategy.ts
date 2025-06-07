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

// Tank Assignment Strategy: Direct inventory assignment (used for initial setup, corrections)
export class TankAssignmentStrategy extends TankTransactionStrategy {
  async validateRequest(request: TankTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.ASSIGNMENT) {
      throw new Error("Invalid transaction type for Assignment strategy");
    }

    if (request.quantity < 0) {
      throw new Error("Assignment quantity cannot be negative");
    }

    // For assignments, we need to know what type of tanks we're assigning
    if (!request.tankType || !["full", "empty"].includes(request.tankType)) {
      throw new Error("Tank type must be specified for assignments: 'full' or 'empty'");
    }
  }

  calculateChanges(request: TankTransactionRequest): TankTransactionChanges {
    // Assignment: Direct assignment of specified tank type
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

      // Direct assignment - always increment
      await this.inventoryTransactionRepository.incrementTankByInventoryId(
        request.inventoryId,
        request.tankTypeId,
        changes.fullTanksChange,
        changes.emptyTanksChange,
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Asignación de tanques ${request.tankType === "full" ? "llenos" : "vacíos"}`,
        request.referenceId
      );

      // Get updated quantities
      const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        request.inventoryId,
        request.tankTypeId
      );

      return {
        success: true,
        message: `Asignación de ${request.quantity} tanque(s) ${request.tankType === "full" ? "llenos" : "vacíos"} registrada exitosamente`,
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
      throw new InternalError(`Error procesando asignación de tanques: ${error}`);
    }
  }
}

// Item Assignment Strategy: Direct inventory assignment
export class ItemAssignmentStrategy extends ItemTransactionStrategy {
  async validateRequest(request: ItemTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.ASSIGNMENT) {
      throw new Error("Invalid transaction type for Assignment strategy");
    }

    if (request.quantity < 0) {
      throw new Error("Assignment quantity cannot be negative");
    }
  }

  calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges {
    // Assignment: Direct assignment
    return {
      itemChange: request.quantity,
    };
  }

  async execute(request: ItemTransactionRequest, skipValidation = false): Promise<ItemTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      // Direct assignment - always increment
      await this.inventoryTransactionRepository.incrementItemByInventoryId(
        request.inventoryId,
        request.inventoryItemId,
        request.quantity,
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Asignación de artículos`
      );

      // Get updated quantity
      const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        request.inventoryId,
        request.inventoryItemId
      );

      return {
        success: true,
        message: `Asignación de ${request.quantity} artículo(s) registrada exitosamente`,
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
      throw new InternalError(`Error procesando asignación de artículos: ${error}`);
    }
  }
}