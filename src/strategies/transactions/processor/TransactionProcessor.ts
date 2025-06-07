import { TransactionStrategyFactory } from "../factory/TransactionStrategyFactory";
import { TransactionRequest } from "../base/TransactionRequest";
import { TransactionResult } from "../base/TransactionResult";
import { IInventoryTransactionRepository } from "../../../repositories/inventory";
import { InternalError } from "../../../utils/custom-errors";

export class TransactionProcessor {
  private readonly strategyFactory: TransactionStrategyFactory;

  constructor(
    inventoryTransactionRepository: IInventoryTransactionRepository
  ) {
    this.strategyFactory = new TransactionStrategyFactory(inventoryTransactionRepository);
  }

  /**
   * Processes a single transaction using the appropriate strategy
   */
  async processTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      // Create the appropriate strategy for this transaction
      const strategy = this.strategyFactory.createFromRequest(request);

      // Validate the request
      await strategy.validateRequest(request);

      // Execute the transaction (skip validation since we already validated)
      const result = await strategy.execute(request, true);

      return result;
    } catch (error) {
      throw new InternalError(`Error processing transaction: ${error}`);
    }
  }

  /**
   * Processes multiple transactions in batch
   * Note: For transfers, this will handle both source and target operations
   */
  async processBatchTransactions(
    requests: TransactionRequest[]
  ): Promise<TransactionResult[]> {
    const results: TransactionResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const result = await this.processTransaction(requests[i]);
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (errors.length > 0) {
      throw new InternalError(`Batch processing failed for ${errors.length} transactions: ${JSON.stringify(errors)}`);
    }

    return results;
  }

  /**
   * Validates a transaction request without executing it
   */
  async validateTransaction(request: TransactionRequest): Promise<void> {
    const strategy = this.strategyFactory.createFromRequest(request);
    await strategy.validateRequest(request);
  }

  /**
   * Gets the calculated changes for a transaction without executing it
   */
  calculateTransactionChanges(request: TransactionRequest) {
    const strategy = this.strategyFactory.createFromRequest(request);
    return strategy.calculateChanges(request);
  }

  /**
   * Gets supported transaction types for entity type
   */
  getSupportedTransactionTypes(entityType: "tank" | "item") {
    return this.strategyFactory.getSupportedTransactionTypes(entityType);
  }
}