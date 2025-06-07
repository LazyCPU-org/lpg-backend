import { TransactionStrategyFactory } from '../factory/TransactionStrategyFactory';
import { TransactionTypeEnum } from '../../../db/schemas/inventory/item-transactions';
import { TankTransactionRequest, ItemTransactionRequest } from '../base/TransactionRequest';
import { createMockRepository } from './__mocks__/mockRepository';

// Import strategy classes for type checking
import { TankSaleStrategy, ItemSaleStrategy } from '../implementations/SaleTransactionStrategy';
import { TankPurchaseStrategy, ItemPurchaseStrategy } from '../implementations/PurchaseTransactionStrategy';
import { TankReturnStrategy, ItemReturnStrategy } from '../implementations/ReturnTransactionStrategy';
import { TankTransferStrategy, ItemTransferStrategy } from '../implementations/TransferTransactionStrategy';
import { TankAssignmentStrategy, ItemAssignmentStrategy } from '../implementations/AssignmentTransactionStrategy';

// Mock repository
const mockRepository = createMockRepository();

describe('TransactionStrategyFactory', () => {
  let factory: TransactionStrategyFactory;

  beforeEach(() => {
    factory = new TransactionStrategyFactory(mockRepository);
  });

  describe('create', () => {
    describe('Tank Strategies', () => {
      it('should create TankSaleStrategy for SALE transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.SALE, 'tank');
        expect(strategy).toBeInstanceOf(TankSaleStrategy);
      });

      it('should create TankPurchaseStrategy for PURCHASE transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.PURCHASE, 'tank');
        expect(strategy).toBeInstanceOf(TankPurchaseStrategy);
      });

      it('should create TankReturnStrategy for RETURN transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.RETURN, 'tank');
        expect(strategy).toBeInstanceOf(TankReturnStrategy);
      });

      it('should create TankTransferStrategy for TRANSFER transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.TRANSFER, 'tank');
        expect(strategy).toBeInstanceOf(TankTransferStrategy);
      });

      it('should create TankAssignmentStrategy for ASSIGNMENT transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.ASSIGNMENT, 'tank');
        expect(strategy).toBeInstanceOf(TankAssignmentStrategy);
      });
    });

    describe('Item Strategies', () => {
      it('should create ItemSaleStrategy for SALE transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.SALE, 'item');
        expect(strategy).toBeInstanceOf(ItemSaleStrategy);
      });

      it('should create ItemPurchaseStrategy for PURCHASE transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.PURCHASE, 'item');
        expect(strategy).toBeInstanceOf(ItemPurchaseStrategy);
      });

      it('should create ItemReturnStrategy for RETURN transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.RETURN, 'item');
        expect(strategy).toBeInstanceOf(ItemReturnStrategy);
      });

      it('should create ItemTransferStrategy for TRANSFER transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.TRANSFER, 'item');
        expect(strategy).toBeInstanceOf(ItemTransferStrategy);
      });

      it('should create ItemAssignmentStrategy for ASSIGNMENT transaction', () => {
        const strategy = factory.create(TransactionTypeEnum.ASSIGNMENT, 'item');
        expect(strategy).toBeInstanceOf(ItemAssignmentStrategy);
      });
    });

    describe('Error Cases', () => {
      it('should throw error for unsupported entity type', () => {
        expect(() => {
          factory.create(TransactionTypeEnum.SALE, 'invalid' as any);
        }).toThrow('Unsupported entity type: invalid');
      });

      it('should throw error for unsupported tank transaction type', () => {
        expect(() => {
          factory.create('invalid' as any, 'tank');
        }).toThrow('Unsupported tank transaction type: invalid');
      });

      it('should throw error for unsupported item transaction type', () => {
        expect(() => {
          factory.create('invalid' as any, 'item');
        }).toThrow('Unsupported item transaction type: invalid');
      });
    });
  });

  describe('createFromRequest', () => {
    it('should create tank strategy from tank transaction request', () => {
      const tankRequest: TankTransactionRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 2,
        userId: 1,
      };

      const strategy = factory.createFromRequest(tankRequest);
      expect(strategy).toBeInstanceOf(TankSaleStrategy);
    });

    it('should create item strategy from item transaction request', () => {
      const itemRequest: ItemTransactionRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionTypeEnum.PURCHASE,
        quantity: 5,
        userId: 1,
      };

      const strategy = factory.createFromRequest(itemRequest);
      expect(strategy).toBeInstanceOf(ItemPurchaseStrategy);
    });

    it('should throw error for request without tank or item identifiers', () => {
      const invalidRequest = {
        inventoryId: 1,
        transactionType: TransactionTypeEnum.SALE,
        quantity: 2,
        userId: 1,
      } as any;

      expect(() => {
        factory.createFromRequest(invalidRequest);
      }).toThrow('Cannot determine entity type from request');
    });
  });

  describe('getSupportedTransactionTypes', () => {
    it('should return all supported transaction types for tanks', () => {
      const types = factory.getSupportedTransactionTypes('tank');
      
      expect(types).toEqual([
        TransactionTypeEnum.SALE,
        TransactionTypeEnum.PURCHASE,
        TransactionTypeEnum.RETURN,
        TransactionTypeEnum.TRANSFER,
        TransactionTypeEnum.ASSIGNMENT,
      ]);
    });

    it('should return all supported transaction types for items', () => {
      const types = factory.getSupportedTransactionTypes('item');
      
      expect(types).toEqual([
        TransactionTypeEnum.SALE,
        TransactionTypeEnum.PURCHASE,
        TransactionTypeEnum.RETURN,
        TransactionTypeEnum.TRANSFER,
        TransactionTypeEnum.ASSIGNMENT,
      ]);
    });
  });

  describe('isTransactionTypeSupported', () => {
    it('should return true for supported tank transaction types', () => {
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.SALE, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.PURCHASE, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.RETURN, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.TRANSFER, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.ASSIGNMENT, 'tank')).toBe(true);
    });

    it('should return true for supported item transaction types', () => {
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.SALE, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.PURCHASE, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.RETURN, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.TRANSFER, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionTypeEnum.ASSIGNMENT, 'item')).toBe(true);
    });

    it('should return false for unsupported transaction types', () => {
      expect(factory.isTransactionTypeSupported('invalid' as any, 'tank')).toBe(false);
      expect(factory.isTransactionTypeSupported('invalid' as any, 'item')).toBe(false);
    });
  });
});