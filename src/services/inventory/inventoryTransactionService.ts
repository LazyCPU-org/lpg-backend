import { TransactionProcessor } from "../../strategies/transactions";
import { IInventoryTransactionRepository } from "../../repositories/inventory";
import {
  TankTransactionRequest,
  ItemTransactionRequest,
  BatchTankTransactionsRequest,
  BatchItemTransactionsRequest,
  convertTankTransactionToStrategyRequest,
  convertItemTransactionToStrategyRequest,
} from "../../dtos/request/transactionDTO";
import {
  TankTransactionResponse,
  ItemTransactionResponse,
  BatchTransactionResponse,
  TransactionValidationResponse,
  SupportedTransactionsResponse,
  TransactionTypeInfo,
} from "../../dtos/response/transactionInterface";
import { TransactionTypeEnum, TransactionType } from "../../db/schemas/inventory/item-transactions";
import { InternalError, NotFoundError } from "../../utils/custom-errors";

export abstract class IInventoryTransactionService {
  // Single transaction methods
  abstract createTankTransaction(
    request: TankTransactionRequest,
    userId: number
  ): Promise<TankTransactionResponse>;

  abstract createItemTransaction(
    request: ItemTransactionRequest,
    userId: number
  ): Promise<ItemTransactionResponse>;

  // Batch transaction methods
  abstract processBatchTankTransactions(
    request: BatchTankTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResponse>;

  abstract processBatchItemTransactions(
    request: BatchItemTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResponse>;

  // Validation and info methods
  abstract validateTankTransaction(
    request: TankTransactionRequest,
    userId: number
  ): Promise<TransactionValidationResponse>;

  abstract validateItemTransaction(
    request: ItemTransactionRequest,
    userId: number
  ): Promise<TransactionValidationResponse>;

  abstract getSupportedTransactionTypes(
    entityType: "tank" | "item"
  ): Promise<SupportedTransactionsResponse>;

  // Quantity query methods for compatibility
  abstract getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<{ inventoryId: number; tankTypeId: number; currentFullTanks: number; currentEmptyTanks: number; }>;

  abstract getCurrentItemQuantity(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<{ inventoryId: number; inventoryItemId: number; currentItems: number; }>;
}

export class InventoryTransactionService implements IInventoryTransactionService {
  private readonly transactionProcessor: TransactionProcessor;

  constructor(
    private readonly inventoryTransactionRepository: IInventoryTransactionRepository
  ) {
    this.transactionProcessor = new TransactionProcessor(inventoryTransactionRepository);
  }

  async createTankTransaction(
    request: TankTransactionRequest,
    userId: number
  ): Promise<TankTransactionResponse> {
    try {
      const { inventoryId, transaction } = request;

      // Convert to strategy request
      const strategyRequest = convertTankTransactionToStrategyRequest(
        inventoryId,
        transaction,
        userId
      );

      // Process transaction using strategy
      const result = await this.transactionProcessor.processTransaction(strategyRequest);

      // Convert to simplified response
      if (!('currentQuantities' in result)) {
        throw new InternalError("Invalid result type for tank transaction");
      }

      return {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        inventory: {
          inventoryId: result.currentQuantities.inventoryId,
          tankType: {
            tankTypeId: result.currentQuantities.tankTypeId,
          },
          quantities: {
            fullTanks: result.currentQuantities.currentFullTanks,
            emptyTanks: result.currentQuantities.currentEmptyTanks,
            totalTanks: result.currentQuantities.currentFullTanks + result.currentQuantities.currentEmptyTanks,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacción de tanques: ${error}`);
    }
  }

  async createItemTransaction(
    request: ItemTransactionRequest,
    userId: number
  ): Promise<ItemTransactionResponse> {
    try {
      const { inventoryId, transaction } = request;

      // Convert to strategy request
      const strategyRequest = convertItemTransactionToStrategyRequest(
        inventoryId,
        transaction,
        userId
      );

      // Process transaction using strategy
      const result = await this.transactionProcessor.processTransaction(strategyRequest);

      // Convert to simplified response
      if (!('currentQuantity' in result)) {
        throw new InternalError("Invalid result type for item transaction");
      }

      return {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        inventory: {
          inventoryId: result.currentQuantity.inventoryId,
          item: {
            inventoryItemId: result.currentQuantity.inventoryItemId,
          },
          quantity: {
            currentItems: result.currentQuantity.currentItems,
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof InternalError) {
        throw error;
      }
      throw new InternalError(`Error procesando transacción de artículos: ${error}`);
    }
  }

  async processBatchTankTransactions(
    request: BatchTankTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResponse> {
    try {
      const { inventoryId, transactions } = request;
      const results: TankTransactionResponse[] = [];
      const failures: Array<{ index: number; error: string; transaction: any }> = [];

      for (let i = 0; i < transactions.length; i++) {
        try {
          const singleRequest = { inventoryId, transaction: transactions[i] };
          const result = await this.createTankTransaction(singleRequest, userId);
          results.push(result);
        } catch (error) {
          failures.push({
            index: i,
            error: error instanceof Error ? error.message : String(error),
            transaction: transactions[i],
          });
        }
      }

      return {
        success: failures.length === 0,
        message: failures.length === 0 
          ? `${transactions.length} transacciones de tanques procesadas exitosamente`
          : `${results.length}/${transactions.length} transacciones procesadas. ${failures.length} fallaron.`,
        timestamp: new Date().toISOString(),
        batch: {
          totalRequested: transactions.length,
          successfullyProcessed: results.length,
          failed: failures.length,
        },
        results,
        failures: failures.length > 0 ? failures : undefined,
      };
    } catch (error) {
      throw new InternalError(`Error procesando transacciones en lote de tanques: ${error}`);
    }
  }

  async processBatchItemTransactions(
    request: BatchItemTransactionsRequest,
    userId: number
  ): Promise<BatchTransactionResponse> {
    try {
      const { inventoryId, transactions } = request;
      const results: ItemTransactionResponse[] = [];
      const failures: Array<{ index: number; error: string; transaction: any }> = [];

      for (let i = 0; i < transactions.length; i++) {
        try {
          const singleRequest = { inventoryId, transaction: transactions[i] };
          const result = await this.createItemTransaction(singleRequest, userId);
          results.push(result);
        } catch (error) {
          failures.push({
            index: i,
            error: error instanceof Error ? error.message : String(error),
            transaction: transactions[i],
          });
        }
      }

      return {
        success: failures.length === 0,
        message: failures.length === 0 
          ? `${transactions.length} transacciones de artículos procesadas exitosamente`
          : `${results.length}/${transactions.length} transacciones procesadas. ${failures.length} fallaron.`,
        timestamp: new Date().toISOString(),
        batch: {
          totalRequested: transactions.length,
          successfullyProcessed: results.length,
          failed: failures.length,
        },
        results,
        failures: failures.length > 0 ? failures : undefined,
      };
    } catch (error) {
      throw new InternalError(`Error procesando transacciones en lote de artículos: ${error}`);
    }
  }

  async validateTankTransaction(
    request: TankTransactionRequest,
    userId: number
  ): Promise<TransactionValidationResponse> {
    try {
      const { inventoryId, transaction } = request;
      
      // Convert to strategy request
      const strategyRequest = convertTankTransactionToStrategyRequest(
        inventoryId,
        transaction,
        userId
      );

      // Validate using strategy
      await this.transactionProcessor.validateTransaction(strategyRequest);

      // Calculate changes
      const changes = this.transactionProcessor.calculateTransactionChanges(strategyRequest);

      return {
        valid: true,
        calculatedChanges: 'fullTanksChange' in changes ? {
          fullTanksChange: changes.fullTanksChange,
          emptyTanksChange: changes.emptyTanksChange,
        } : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async validateItemTransaction(
    request: ItemTransactionRequest,
    userId: number
  ): Promise<TransactionValidationResponse> {
    try {
      const { inventoryId, transaction } = request;
      
      // Convert to strategy request
      const strategyRequest = convertItemTransactionToStrategyRequest(
        inventoryId,
        transaction,
        userId
      );

      // Validate using strategy
      await this.transactionProcessor.validateTransaction(strategyRequest);

      // Calculate changes
      const changes = this.transactionProcessor.calculateTransactionChanges(strategyRequest);

      return {
        valid: true,
        calculatedChanges: 'itemChange' in changes ? {
          itemChange: changes.itemChange,
        } : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async getSupportedTransactionTypes(
    entityType: "tank" | "item"
  ): Promise<SupportedTransactionsResponse> {
    const supportedTypes = this.transactionProcessor.getSupportedTransactionTypes(entityType);
    
    const transactionInfoMap: Record<TransactionType, TransactionTypeInfo> = {
      [TransactionTypeEnum.SALE]: {
        transactionType: "sale",
        description: "Venta a cliente",
        businessLogic: entityType === "tank" 
          ? "Cliente toma tanque lleno, devuelve tanque vacío" 
          : "Reduce cantidad de artículos",
        requiredFields: ["quantity"],
        examples: [{
          description: "Venta de 2 tanques",
          example: { transactionType: "sale", quantity: 2 }
        }],
      },
      [TransactionTypeEnum.PURCHASE]: {
        transactionType: "purchase",
        description: "Compra a proveedor",
        businessLogic: entityType === "tank" 
          ? "Intercambio con proveedor: entrega tanques vacíos, recibe tanques llenos" 
          : "Aumenta cantidad de artículos",
        requiredFields: ["quantity"],
        examples: [{
          description: "Compra de 10 tanques",
          example: { transactionType: "purchase", quantity: 10 }
        }],
      },
      [TransactionTypeEnum.RETURN]: {
        transactionType: "return",
        description: "Devolución de cliente",
        businessLogic: entityType === "tank" 
          ? "Cliente devuelve tanques (especificar si llenos o vacíos)" 
          : "Aumenta cantidad de artículos",
        requiredFields: entityType === "tank" ? ["quantity", "tankType"] : ["quantity"],
        examples: [{
          description: "Devolución de 1 tanque vacío",
          example: { transactionType: "return", quantity: 1, tankType: "empty" }
        }],
      },
      [TransactionTypeEnum.TRANSFER]: {
        transactionType: "transfer",
        description: "Transferencia entre tiendas",
        businessLogic: "Mueve inventario de una asignación de tienda a otra",
        requiredFields: entityType === "tank" 
          ? ["quantity", "tankType", "targetStoreAssignmentId"] 
          : ["quantity", "targetStoreAssignmentId"],
        examples: [{
          description: "Transferir 5 tanques llenos a otra tienda",
          example: { transactionType: "transfer", quantity: 5, tankType: "full", targetStoreAssignmentId: 123 }
        }],
      },
      [TransactionTypeEnum.ASSIGNMENT]: {
        transactionType: "assignment",
        description: "Asignación inicial",
        businessLogic: "Asignación directa de inventario (configuración inicial o correcciones)",
        requiredFields: entityType === "tank" ? ["quantity", "tankType"] : ["quantity"],
        examples: [{
          description: "Asignación inicial de 20 tanques llenos",
          example: { transactionType: "assignment", quantity: 20, tankType: "full" }
        }],
      },
    };

    return {
      entityType,
      supportedTransactions: supportedTypes.map(type => transactionInfoMap[type]),
    };
  }

  // Quantity query methods for compatibility
  async getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<{ inventoryId: number; tankTypeId: number; currentFullTanks: number; currentEmptyTanks: number; }> {
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
  ): Promise<{ inventoryId: number; inventoryItemId: number; currentItems: number; }> {
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