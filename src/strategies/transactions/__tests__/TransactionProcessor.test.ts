import { TransactionProcessor } from '../processor/TransactionProcessor';
import { TransactionTypeEnum } from '../../../db/schemas/inventory/item-transactions';
import { TankTransactionRequest, ItemTransactionRequest } from '../base/TransactionRequest';
import { createMockRepository } from './__mocks__/mockRepository';

// Mock repository
const mockRepository = createMockRepository();

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;

  beforeEach(() => {
    processor = new TransactionProcessor(mockRepository);
    jest.clearAllMocks();
  });

  describe('processTransaction', () => {
    it('should process tank sale transaction successfully', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 3,
        userId: 1,
        notes: 'Customer purchase',
      };

      // Mock repository responses for validation and execution
      mockRepository.getCurrentTankQuantities
        .mockResolvedValueOnce({ currentFullTanks: 10, currentEmptyTanks: 5 }) // Validation
        .mockResolvedValueOnce({ currentFullTanks: 7, currentEmptyTanks: 8 }); // After execution

      mockRepository.decrementTankByInventoryId.mockResolvedValue(undefined);
      mockRepository.incrementTankByInventoryId.mockResolvedValue(undefined);

      const result = await processor.processTransaction(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Venta de 3 tanque(s) registrada exitosamente');
      expect('currentQuantities' in result && result.currentQuantities).toEqual({
        inventoryId: 1,
        tankTypeId: 1,
        currentFullTanks: 7,
        currentEmptyTanks: 8,
      });
    });

    it('should process item purchase transaction successfully', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 20,
        userId: 1,
        notes: 'Supplier delivery',
      };

      mockRepository.getCurrentItemQuantity.mockResolvedValue({
        currentItems: 50, // After purchase
      });

      mockRepository.incrementItemByInventoryId.mockResolvedValue(undefined);

      const result = await processor.processTransaction(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Compra de 20 artículo(s) registrada exitosamente');
      expect('currentQuantity' in result && result.currentQuantity).toEqual({
        inventoryId: 1,
        inventoryItemId: 1,
        currentItems: 50,
      });
    });

    it('should handle validation errors', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 15, // More than available
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10, // Not enough
        currentEmptyTanks: 5,
      });

      await expect(processor.processTransaction(request)).rejects.toThrow(/Error processing transaction/);
    });
  });

  describe('processBatchTransactions', () => {
    it('should process multiple transactions successfully', async () => {
      const requests: TankTransactionRequest[] = [
        {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionTypeEnum.SALE,
          quantity: 2,
          userId: 1,
        },
        {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionTypeEnum.PURCHASE,
          quantity: 5,
          userId: 1,
        },
      ];

      // Mock successful validation and execution for both requests
      mockRepository.getCurrentTankQuantities
        .mockResolvedValueOnce({ currentFullTanks: 10, currentEmptyTanks: 5 }) // Sale validation
        .mockResolvedValueOnce({ currentFullTanks: 8, currentEmptyTanks: 7 })  // Sale result
        .mockResolvedValueOnce({ currentFullTanks: 8, currentEmptyTanks: 7 })  // Purchase validation
        .mockResolvedValueOnce({ currentFullTanks: 13, currentEmptyTanks: 2 }); // Purchase result

      mockRepository.decrementTankByInventoryId.mockResolvedValue(undefined);
      mockRepository.incrementTankByInventoryId.mockResolvedValue(undefined);

      const results = await processor.processBatchTransactions(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      const requests: TankTransactionRequest[] = [
        {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionTypeEnum.SALE,
          quantity: 2,
          userId: 1,
        },
        {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionTypeEnum.SALE,
          quantity: 20, // Will fail - not enough inventory
          userId: 1,
        },
      ];

      // Mock first transaction success, second transaction failure
      mockRepository.getCurrentTankQuantities
        .mockResolvedValueOnce({ currentFullTanks: 10, currentEmptyTanks: 5 }) // First validation
        .mockResolvedValueOnce({ currentFullTanks: 8, currentEmptyTanks: 7 })  // First result
        .mockResolvedValueOnce({ currentFullTanks: 8, currentEmptyTanks: 7 }); // Second validation (will fail)

      mockRepository.decrementTankByInventoryId.mockResolvedValue(undefined);
      mockRepository.incrementTankByInventoryId.mockResolvedValue(undefined);

      await expect(processor.processBatchTransactions(requests)).rejects.toThrow(/Batch processing failed/);
    });
  });

  describe('validateTransaction', () => {
    it('should validate transaction without executing it', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 3,
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10,
        currentEmptyTanks: 5,
      });

      await expect(processor.validateTransaction(request)).resolves.not.toThrow();

      // Verify only validation was called, not execution
      expect(mockRepository.getCurrentTankQuantities).toHaveBeenCalledTimes(1);
      expect(mockRepository.decrementTankByInventoryId).not.toHaveBeenCalled();
      expect(mockRepository.incrementTankByInventoryId).not.toHaveBeenCalled();
    });

    it('should throw validation error without executing', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 15, // More than available
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10,
        currentEmptyTanks: 5,
      });

      await expect(processor.validateTransaction(request)).rejects.toThrow(/Insufficient full tanks/);
    });
  });

  describe('calculateTransactionChanges', () => {
    it('should calculate tank transaction changes without executing', () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 4,
        userId: 1,
      };

      const changes = processor.calculateTransactionChanges(request);

      expect(changes).toEqual({
        fullTanksChange: -4,
        emptyTanksChange: 4,
      });

      // Verify no repository calls were made
      expect(mockRepository.getCurrentTankQuantities).not.toHaveBeenCalled();
      expect(mockRepository.decrementTankByInventoryId).not.toHaveBeenCalled();
    });

    it('should calculate item transaction changes without executing', () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 15,
        userId: 1,
      };

      const changes = processor.calculateTransactionChanges(request);

      expect(changes).toEqual({
        itemChange: 15,
      });
    });
  });

  describe('getSupportedTransactionTypes', () => {
    it('should return supported transaction types for tank', () => {
      const types = processor.getSupportedTransactionTypes('tank');
      
      expect(types).toEqual([
        TransactionTypeEnum.SALE,
        TransactionTypeEnum.PURCHASE,
        TransactionTypeEnum.RETURN,
        TransactionTypeEnum.TRANSFER,
        TransactionTypeEnum.ASSIGNMENT,
      ]);
    });

    it('should return supported transaction types for item', () => {
      const types = processor.getSupportedTransactionTypes('item');
      
      expect(types).toEqual([
        TransactionTypeEnum.SALE,
        TransactionTypeEnum.PURCHASE,
        TransactionTypeEnum.RETURN,
        TransactionTypeEnum.TRANSFER,
        TransactionTypeEnum.ASSIGNMENT,
      ]);
    });
  });
});