import { TankPurchaseStrategy, ItemPurchaseStrategy } from '../implementations/PurchaseTransactionStrategy';
import { TransactionTypeEnum } from '../../../db/schemas/inventory/item-transactions';
import { TankTransactionRequest, ItemTransactionRequest } from '../base/TransactionRequest';
import { createMockRepository } from './__mocks__/mockRepository';

// Mock the repository
const mockRepository = createMockRepository();

describe('TankPurchaseStrategy', () => {
  let strategy: TankPurchaseStrategy;

  beforeEach(() => {
    strategy = new TankPurchaseStrategy(mockRepository);
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate a correct purchase request', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 5,
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10,
        currentEmptyTanks: 8, // Has enough empty tanks for exchange
      });

      await expect(strategy.validateRequest(request)).resolves.not.toThrow();
    });

    it('should reject invalid transaction type', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 5,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Invalid transaction type for Purchase strategy');
    });

    it('should reject zero or negative quantity', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: -1,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Purchase quantity must be positive');
    });

    it('should reject insufficient empty tanks for exchange', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 10,
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 15,
        currentEmptyTanks: 5, // Not enough empty tanks for exchange
      });

      await expect(strategy.validateRequest(request)).rejects.toThrow('Insufficient empty tanks for exchange. Available: 5, Required: 10');
    });
  });

  describe('calculateChanges', () => {
    it('should calculate correct changes for supplier exchange', () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 8,
        userId: 1,
      };

      const changes = strategy.calculateChanges(request);

      expect(changes).toEqual({
        fullTanksChange: 8,   // Receive full tanks from supplier
        emptyTanksChange: -8, // Give empty tanks to supplier
      });
    });
  });

  describe('execute', () => {
    it('should execute tank purchase transaction successfully', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 4,
        userId: 1,
        notes: 'Supplier delivery',
        referenceId: 123,
      };

      // Mock validation passing
      mockRepository.getCurrentTankQuantities
        .mockResolvedValueOnce({ currentFullTanks: 10, currentEmptyTanks: 6 }) // For validation
        .mockResolvedValueOnce({ currentFullTanks: 14, currentEmptyTanks: 2 }); // After transaction

      mockRepository.decrementTankByInventoryId.mockResolvedValue(undefined);
      mockRepository.incrementTankByInventoryId.mockResolvedValue(undefined);

      const result = await strategy.execute(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Compra de 4 tanque(s) registrada exitosamente');
      expect(result.currentQuantities).toEqual({
        inventoryId: 1,
        tankTypeId: 1,
        currentFullTanks: 14,
        currentEmptyTanks: 2,
      });

      // Verify correct repository calls - first remove empty tanks, then add full tanks
      expect(mockRepository.decrementTankByInventoryId).toHaveBeenCalledWith(
        1, 1, 0, 4, TransactionTypeEnum.PURCHASE, 1, 'Supplier delivery - Tanques vacíos entregados al proveedor', 123
      );
      expect(mockRepository.incrementTankByInventoryId).toHaveBeenCalledWith(
        1, 1, 4, 0, TransactionTypeEnum.PURCHASE, 1, 'Supplier delivery', 123
      );
    });
  });
});

describe('ItemPurchaseStrategy', () => {
  let strategy: ItemPurchaseStrategy;

  beforeEach(() => {
    strategy = new ItemPurchaseStrategy(mockRepository);
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate a correct item purchase request', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 15,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).resolves.not.toThrow();
    });

    it('should reject invalid transaction type', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.RETURN,
        quantity: 15,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Invalid transaction type for Purchase strategy');
    });

    it('should reject zero or negative quantity', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 0,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Purchase quantity must be positive');
    });
  });

  describe('calculateChanges', () => {
    it('should calculate correct changes for item increase', () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 12,
        userId: 1,
      };

      const changes = strategy.calculateChanges(request);

      expect(changes).toEqual({
        itemChange: 12, // Increase item count
      });
    });
  });

  describe('execute', () => {
    it('should execute item purchase transaction successfully', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 25,
        userId: 1,
        notes: 'Supplier restock',
      };

      mockRepository.getCurrentItemQuantity.mockResolvedValue({
        currentItems: 45, // After transaction
      });

      mockRepository.incrementItemByInventoryId.mockResolvedValue(undefined);

      const result = await strategy.execute(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Compra de 25 artículo(s) registrada exitosamente');
      expect(result.currentQuantity).toEqual({
        inventoryId: 1,
        inventoryItemId: 1,
        currentItems: 45,
      });

      // Verify correct repository call
      expect(mockRepository.incrementItemByInventoryId).toHaveBeenCalledWith(
        1, 1, 25, TransactionTypeEnum.PURCHASE, 1, 'Supplier restock'
      );
    });
  });
});