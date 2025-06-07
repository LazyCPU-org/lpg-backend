import { TankSaleStrategy, ItemSaleStrategy } from '../implementations/SaleTransactionStrategy';
import { TankTransactionRequest, ItemTransactionRequest } from '../base/TransactionRequest';
import { createMockRepository } from './__mocks__/mockRepository';

// Use string literals instead of importing the enum to avoid circular dependencies
const TransactionType = {
  SALE: 'sale' as const,
  PURCHASE: 'purchase' as const,
  RETURN: 'return' as const,
  TRANSFER: 'transfer' as const,
  ASSIGNMENT: 'assignment' as const,
};

// Mock the repository
const mockRepository = createMockRepository();

describe('TankSaleStrategy', () => {
  let strategy: TankSaleStrategy;

  beforeEach(() => {
    strategy = new TankSaleStrategy(mockRepository);
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate a correct sale request', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 2,
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10,
        currentEmptyTanks: 5,
      });

      await expect(strategy.validateRequest(request)).resolves.not.toThrow();
    });

    it('should reject invalid transaction type', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.PURCHASE,
        quantity: 2,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Invalid transaction type for Sale strategy');
    });

    it('should reject zero or negative quantity', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 0,
        userId: 1,
      };

      await expect(strategy.validateRequest(request)).rejects.toThrow('Sale quantity must be positive');
    });

    it('should reject insufficient full tanks', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 15,
        userId: 1,
      };

      mockRepository.getCurrentTankQuantities.mockResolvedValue({
        currentFullTanks: 10,
        currentEmptyTanks: 5,
      });

      await expect(strategy.validateRequest(request)).rejects.toThrow('Insufficient full tanks. Available: 10, Requested: 15');
    });
  });

  describe('calculateChanges', () => {
    it('should calculate correct changes for tank exchange', () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 3,
        userId: 1,
      };

      const changes = strategy.calculateChanges(request);

      expect(changes).toEqual({
        fullTanksChange: -3,  // Customer takes full tanks
        emptyTanksChange: 3,  // Customer returns empty tanks
      });
    });
  });

  describe('execute', () => {
    it('should execute tank sale transaction successfully', async () => {
      const request: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 2,
        userId: 1,
        notes: 'Customer purchase',
      };

      // Mock validation passing
      mockRepository.getCurrentTankQuantities
        .mockResolvedValueOnce({ currentFullTanks: 10, currentEmptyTanks: 5 }) // For validation
        .mockResolvedValueOnce({ currentFullTanks: 8, currentEmptyTanks: 7 }); // After transaction

      mockRepository.decrementTankByInventoryId.mockResolvedValue(undefined);
      mockRepository.incrementTankByInventoryId.mockResolvedValue(undefined);

      const result = await strategy.execute(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Venta de 2 tanque(s) registrada exitosamente');
      expect(result.currentQuantities).toEqual({
        inventoryId: 1,
        tankTypeId: 1,
        currentFullTanks: 8,
        currentEmptyTanks: 7,
      });

      // Verify correct repository calls
      expect(mockRepository.decrementTankByInventoryId).toHaveBeenCalledWith(
        1, 1, 2, 0, TransactionType.SALE, 1, 'Customer purchase', undefined
      );
      expect(mockRepository.incrementTankByInventoryId).toHaveBeenCalledWith(
        1, 1, 0, 2, TransactionType.SALE, 1, 'Customer purchase - Tanques vacíos recibidos', undefined
      );
    });
  });
});

describe('ItemSaleStrategy', () => {
  let strategy: ItemSaleStrategy;

  beforeEach(() => {
    strategy = new ItemSaleStrategy(mockRepository);
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate a correct item sale request', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.SALE,
        quantity: 5,
        userId: 1,
      };

      mockRepository.getCurrentItemQuantity.mockResolvedValue({
        currentItems: 20,
      });

      await expect(strategy.validateRequest(request)).resolves.not.toThrow();
    });

    it('should reject insufficient items', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.SALE,
        quantity: 25,
        userId: 1,
      };

      mockRepository.getCurrentItemQuantity.mockResolvedValue({
        currentItems: 20,
      });

      await expect(strategy.validateRequest(request)).rejects.toThrow('Insufficient items. Available: 20, Requested: 25');
    });
  });

  describe('calculateChanges', () => {
    it('should calculate correct changes for item reduction', () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.SALE,
        quantity: 5,
        userId: 1,
      };

      const changes = strategy.calculateChanges(request);

      expect(changes).toEqual({
        itemChange: -5,  // Reduce item count
      });
    });
  });

  describe('execute', () => {
    it('should execute item sale transaction successfully', async () => {
      const request: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.SALE,
        quantity: 3,
        userId: 1,
        notes: 'Item sale',
      };

      // Mock validation passing
      mockRepository.getCurrentItemQuantity
        .mockResolvedValueOnce({ currentItems: 20 }) // For validation
        .mockResolvedValueOnce({ currentItems: 17 }); // After transaction

      mockRepository.decrementItemByInventoryId.mockResolvedValue(undefined);

      const result = await strategy.execute(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Venta de 3 artículo(s) registrada exitosamente');
      expect(result.currentQuantity).toEqual({
        inventoryId: 1,
        inventoryItemId: 1,
        currentItems: 17,
      });

      // Verify correct repository call
      expect(mockRepository.decrementItemByInventoryId).toHaveBeenCalledWith(
        1, 1, 3, TransactionType.SALE, 1, 'Item sale'
      );
    });
  });
});