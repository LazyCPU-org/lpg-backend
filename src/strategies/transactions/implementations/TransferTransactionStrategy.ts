import { TankTransactionStrategy, ItemTransactionStrategy } from "../base/TransactionStrategy";
import { 
  TankTransactionRequest, 
  ItemTransactionRequest, 
  TankTransactionChanges, 
  ItemTransactionChanges 
} from "../base/TransactionRequest";
import { TransferTransactionResult } from "../base/TransactionResult";
import { TransactionTypeEnum } from "../../../db/schemas/inventory/item-transactions";
import { NotFoundError, InternalError } from "../../../utils/custom-errors";

// Tank Transfer Strategy: Move tanks between store assignments
export class TankTransferStrategy extends TankTransactionStrategy {
  async validateRequest(request: TankTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.TRANSFER) {
      throw new Error("Invalid transaction type for Transfer strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Transfer quantity must be positive");
    }

    if (!request.targetStoreAssignmentId) {
      throw new Error("Target store assignment ID is required for transfers");
    }

    if (!request.tankType || !["full", "empty"].includes(request.tankType)) {
      throw new Error("Tank type must be specified for transfers: 'full' or 'empty'");
    }

    // Validate that source has enough tanks of the specified type
    const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
      request.inventoryId,
      request.tankTypeId
    );

    const availableQuantity = request.tankType === "full" 
      ? currentQuantities.currentFullTanks 
      : currentQuantities.currentEmptyTanks;

    if (availableQuantity < request.quantity) {
      throw new Error(`Insufficient ${request.tankType} tanks. Available: ${availableQuantity}, Requested: ${request.quantity}`);
    }

    // TODO: Validate that source and target are different store assignments
    // This requires access to store assignment repository to check store IDs
    // For now, we'll validate at the service layer
  }

  calculateChanges(request: TankTransactionRequest): TankTransactionChanges {
    // Transfer: Remove from source inventory
    if (request.tankType === "full") {
      return {
        fullTanksChange: -request.quantity,
        emptyTanksChange: 0,
      };
    } else {
      return {
        fullTanksChange: 0,
        emptyTanksChange: -request.quantity,
      };
    }
  }

  async execute(request: TankTransactionRequest, skipValidation = false): Promise<TransferTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      const changes = this.calculateChanges(request);

      // Remove from source inventory
      if (request.tankType === "full") {
        await this.inventoryTransactionRepository.decrementTankByInventoryId(
          request.inventoryId,
          request.tankTypeId,
          request.quantity, // full tanks to remove
          0, // no empty tanks to remove
          request.transactionType,
          request.userId,
          `${request.notes || ''} - Transferencia de tanques llenos`,
          request.referenceId
        );
      } else {
        await this.inventoryTransactionRepository.decrementTankByInventoryId(
          request.inventoryId,
          request.tankTypeId,
          0, // no full tanks to remove
          request.quantity, // empty tanks to remove
          request.transactionType,
          request.userId,
          `${request.notes || ''} - Transferencia de tanques vacíos`,
          request.referenceId
        );
      }

      // Get source updated quantities
      const sourceQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        request.inventoryId,
        request.tankTypeId
      );

      // TODO: Add to target inventory
      // This requires finding the target inventory assignment ID for the target store assignment
      // For now, we'll return a partial result

      return {
        success: true,
        message: `Transferencia de ${request.quantity} tanque(s) ${request.tankType === "full" ? "llenos" : "vacíos"} iniciada exitosamente`,
        sourceUpdate: {
          success: true,
          message: "Source inventory updated",
          currentQuantities: {
            inventoryId: request.inventoryId,
            tankTypeId: request.tankTypeId,
            currentFullTanks: sourceQuantities.currentFullTanks,
            currentEmptyTanks: sourceQuantities.currentEmptyTanks,
          },
        },
        targetUpdate: {
          success: true,
          message: "Target inventory update pending",
          currentQuantities: {
            inventoryId: 0, // TODO: Get target inventory ID
            tankTypeId: request.tankTypeId,
            currentFullTanks: 0, // TODO: Get actual quantities
            currentEmptyTanks: 0,
          },
        },
        transferDetails: {
          sourceStoreAssignmentId: 0, // TODO: Get from inventory lookup
          targetStoreAssignmentId: request.targetStoreAssignmentId!,
          quantity: request.quantity,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transferencia de tanques: ${error}`);
    }
  }
}

// Item Transfer Strategy: Move items between store assignments
export class ItemTransferStrategy extends ItemTransactionStrategy {
  async validateRequest(request: ItemTransactionRequest): Promise<void> {
    if (request.transactionType !== TransactionTypeEnum.TRANSFER) {
      throw new Error("Invalid transaction type for Transfer strategy");
    }

    if (request.quantity <= 0) {
      throw new Error("Transfer quantity must be positive");
    }

    if (!request.targetStoreAssignmentId) {
      throw new Error("Target store assignment ID is required for transfers");
    }

    // Validate that source has enough items
    const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
      request.inventoryId,
      request.inventoryItemId
    );

    if (currentQuantity.currentItems < request.quantity) {
      throw new Error(`Insufficient items. Available: ${currentQuantity.currentItems}, Requested: ${request.quantity}`);
    }

    // TODO: Validate that source and target are different store assignments
  }

  calculateChanges(request: ItemTransactionRequest): ItemTransactionChanges {
    // Transfer: Remove from source inventory
    return {
      itemChange: -request.quantity,
    };
  }

  async execute(request: ItemTransactionRequest, skipValidation = false): Promise<TransferTransactionResult> {
    try {
      if (!skipValidation) {
        await this.validateRequest(request);
      }

      // Remove from source inventory
      await this.inventoryTransactionRepository.decrementItemByInventoryId(
        request.inventoryId,
        request.inventoryItemId,
        request.quantity,
        request.transactionType,
        request.userId,
        `${request.notes || ''} - Transferencia de artículos`
      );

      // Get source updated quantities
      const sourceQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        request.inventoryId,
        request.inventoryItemId
      );

      // TODO: Add to target inventory

      return {
        success: true,
        message: `Transferencia de ${request.quantity} artículo(s) iniciada exitosamente`,
        sourceUpdate: {
          success: true,
          message: "Source inventory updated",
          currentQuantity: {
            inventoryId: request.inventoryId,
            inventoryItemId: request.inventoryItemId,
            currentItems: sourceQuantity.currentItems,
          },
        },
        targetUpdate: {
          success: true,
          message: "Target inventory update pending",
          currentQuantity: {
            inventoryId: 0, // TODO: Get target inventory ID
            inventoryItemId: request.inventoryItemId,
            currentItems: 0, // TODO: Get actual quantity
          },
        },
        transferDetails: {
          sourceStoreAssignmentId: 0, // TODO: Get from inventory lookup
          targetStoreAssignmentId: request.targetStoreAssignmentId!,
          quantity: request.quantity,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transferencia de artículos: ${error}`);
    }
  }
}