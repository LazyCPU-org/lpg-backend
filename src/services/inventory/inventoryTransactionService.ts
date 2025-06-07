import { IInventoryTransactionRepository, TransactionType } from "../../repositories/inventory";
import {
  BatchTransactionResult,
  CurrentItemQuantity,
  CurrentTankQuantities,
  ItemTransactionResult,
  TankTransactionResult,
} from "../../dtos/response/inventoryTransactionInterface";
import {
  BatchItemTransactionsRequest,
  BatchTankTransactionsRequest,
  CreateItemTransactionRequest,
  CreateTankTransactionRequest,
} from "../../dtos/request/inventoryTransactionDTO";
import { InternalError, NotFoundError } from "../../utils/custom-errors";

export interface IInventoryTransactionService {
  // Single transaction methods
  createTankTransaction(
    request: CreateTankTransactionRequest,
    userId: number
  ): Promise<TankTransactionResult>;

  createItemTransaction(
    request: CreateItemTransactionRequest,
    userId: number
  ): Promise<ItemTransactionResult>;

  // Batch transaction methods
  processTankTransactions(
    request: BatchTankTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResult>;

  processItemTransactions(
    request: BatchItemTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResult>;

  // Quantity query methods
  getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<CurrentTankQuantities>;

  getCurrentItemQuantity(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<CurrentItemQuantity>;
}

export class InventoryTransactionService implements IInventoryTransactionService {
  constructor(
    private readonly inventoryTransactionRepository: IInventoryTransactionRepository
  ) {}

  async createTankTransaction(
    request: CreateTankTransactionRequest,
    userId: number
  ): Promise<TankTransactionResult> {
    try {
      const { inventoryId, transaction } = request;
      const {
        tankTypeId,
        fullTanksChange,
        emptyTanksChange,
        transactionType,
        notes,
        referenceId,
      } = transaction;

      // Determine if it's an increment or decrement based on the values
      const isIncrement = fullTanksChange >= 0 && emptyTanksChange >= 0;
      
      if (isIncrement) {
        await this.inventoryTransactionRepository.incrementTankByInventoryId(
          inventoryId,
          tankTypeId,
          fullTanksChange,
          emptyTanksChange,
          transactionType,
          userId,
          notes,
          referenceId
        );
      } else {
        await this.inventoryTransactionRepository.decrementTankByInventoryId(
          inventoryId,
          tankTypeId,
          Math.abs(fullTanksChange),
          Math.abs(emptyTanksChange),
          transactionType,
          userId,
          notes,
          referenceId
        );
      }

      // Get updated quantities
      const currentQuantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        inventoryId,
        tankTypeId
      );

      return {
        success: true,
        message: `Transacción de tanques ${isIncrement ? 'agregada' : 'reducida'} exitosamente`,
        currentQuantities,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacción de tanques: ${error}`);
    }
  }

  async createItemTransaction(
    request: CreateItemTransactionRequest,
    userId: number
  ): Promise<ItemTransactionResult> {
    try {
      const { inventoryId, transaction } = request;
      const { inventoryItemId, itemChange, transactionType, notes } = transaction;

      // Determine if it's an increment or decrement
      const isIncrement = itemChange >= 0;

      if (isIncrement) {
        await this.inventoryTransactionRepository.incrementItemByInventoryId(
          inventoryId,
          inventoryItemId,
          itemChange,
          transactionType,
          userId,
          notes
        );
      } else {
        await this.inventoryTransactionRepository.decrementItemByInventoryId(
          inventoryId,
          inventoryItemId,
          Math.abs(itemChange),
          transactionType,
          userId,
          notes
        );
      }

      // Get updated quantity
      const currentQuantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        inventoryId,
        inventoryItemId
      );

      return {
        success: true,
        message: `Transacción de artículos ${isIncrement ? 'agregada' : 'reducida'} exitosamente`,
        currentQuantity,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacción de artículos: ${error}`);
    }
  }

  async processTankTransactions(
    request: BatchTankTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResult> {
    try {
      const { inventoryId, transactions } = request;

      // Convert to repository format
      const repoTransactions = transactions.map((transaction) => ({
        tankTypeId: transaction.tankTypeId,
        fullTanksChange: transaction.fullTanksChange,
        emptyTanksChange: transaction.emptyTanksChange,
        transactionType: transaction.transactionType,
        userId,
        notes: transaction.notes,
        referenceId: transaction.referenceId,
      }));

      await this.inventoryTransactionRepository.processTankTransactions(
        inventoryId,
        repoTransactions,
        true // Use database transaction for batch operations
      );

      return {
        success: true,
        message: `${transactions.length} transacciones de tanques procesadas exitosamente`,
        processedCount: transactions.length,
        totalCount: transactions.length,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacciones de tanques en lote: ${error}`);
    }
  }

  async processItemTransactions(
    request: BatchItemTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResult> {
    try {
      const { inventoryId, transactions } = request;

      // Convert to repository format
      const repoTransactions = transactions.map((transaction) => ({
        inventoryItemId: transaction.inventoryItemId,
        itemChange: transaction.itemChange,
        transactionType: transaction.transactionType,
        userId,
        notes: transaction.notes,
      }));

      await this.inventoryTransactionRepository.processItemTransactions(
        inventoryId,
        repoTransactions,
        true // Use database transaction for batch operations
      );

      return {
        success: true,
        message: `${transactions.length} transacciones de artículos procesadas exitosamente`,
        processedCount: transactions.length,
        totalCount: transactions.length,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacciones de artículos en lote: ${error}`);
    }
  }

  async getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<CurrentTankQuantities> {
    try {
      const quantities = await this.inventoryTransactionRepository.getCurrentTankQuantities(
        inventoryId,
        tankTypeId
      );

      return {
        inventoryId,
        tankTypeId,
        currentFullTanks: quantities.currentFullTanks,
        currentEmptyTanks: quantities.currentEmptyTanks,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalError(`Error obteniendo cantidades de tanques: ${error}`);
    }
  }

  async getCurrentItemQuantity(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<CurrentItemQuantity> {
    try {
      const quantity = await this.inventoryTransactionRepository.getCurrentItemQuantity(
        inventoryId,
        inventoryItemId
      );

      return {
        inventoryId,
        inventoryItemId,
        currentItems: quantity.currentItems,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalError(`Error obteniendo cantidad de artículos: ${error}`);
    }
  }
}