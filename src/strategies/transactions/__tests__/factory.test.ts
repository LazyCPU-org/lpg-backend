/**
 * Factory Pattern Tests
 * 
 * Tests the factory without importing strategy implementations to avoid circular dependencies
 */

import { TransactionStrategyFactory } from '../factory/TransactionStrategyFactory';
import { createMockRepository } from './__mocks__/mockRepository';

// Mock transaction types to avoid schema imports
const TransactionType = {
  SALE: 'sale' as const,
  PURCHASE: 'purchase' as const,
  RETURN: 'return' as const,
  TRANSFER: 'transfer' as const,
  ASSIGNMENT: 'assignment' as const,
};

const mockRepository = createMockRepository();

describe('TransactionStrategyFactory', () => {
  let factory: TransactionStrategyFactory;

  beforeEach(() => {
    factory = new TransactionStrategyFactory(mockRepository);
  });

  describe('create', () => {
    describe('Tank Strategies', () => {
      it('should create strategies for all tank transaction types', () => {
        const saleStrategy = factory.create(TransactionType.SALE, 'tank');
        const purchaseStrategy = factory.create(TransactionType.PURCHASE, 'tank');
        const returnStrategy = factory.create(TransactionType.RETURN, 'tank');
        const transferStrategy = factory.create(TransactionType.TRANSFER, 'tank');
        const assignmentStrategy = factory.create(TransactionType.ASSIGNMENT, 'tank');

        // Verify strategies are created (not null/undefined)
        expect(saleStrategy).toBeDefined();
        expect(purchaseStrategy).toBeDefined();
        expect(returnStrategy).toBeDefined();
        expect(transferStrategy).toBeDefined();
        expect(assignmentStrategy).toBeDefined();

        // Verify they have the required methods
        expect(typeof saleStrategy.validateRequest).toBe('function');
        expect(typeof saleStrategy.calculateChanges).toBe('function');
        expect(typeof saleStrategy.execute).toBe('function');
      });
    });

    describe('Item Strategies', () => {
      it('should create strategies for all item transaction types', () => {
        const saleStrategy = factory.create(TransactionType.SALE, 'item');
        const purchaseStrategy = factory.create(TransactionType.PURCHASE, 'item');
        const returnStrategy = factory.create(TransactionType.RETURN, 'item');
        const transferStrategy = factory.create(TransactionType.TRANSFER, 'item');
        const assignmentStrategy = factory.create(TransactionType.ASSIGNMENT, 'item');

        // Verify strategies are created
        expect(saleStrategy).toBeDefined();
        expect(purchaseStrategy).toBeDefined();
        expect(returnStrategy).toBeDefined();
        expect(transferStrategy).toBeDefined();
        expect(assignmentStrategy).toBeDefined();

        // Verify they have the required methods
        expect(typeof saleStrategy.validateRequest).toBe('function');
        expect(typeof saleStrategy.calculateChanges).toBe('function');
        expect(typeof saleStrategy.execute).toBe('function');
      });
    });

    describe('Error Cases', () => {
      it('should throw error for unsupported entity type', () => {
        expect(() => {
          factory.create(TransactionType.SALE, 'invalid' as any);
        }).toThrow('Unsupported entity type: invalid');
      });

      it('should throw error for unsupported transaction type', () => {
        expect(() => {
          factory.create('invalid' as any, 'tank');
        }).toThrow('Unsupported tank transaction type: invalid');

        expect(() => {
          factory.create('invalid' as any, 'item');
        }).toThrow('Unsupported item transaction type: invalid');
      });
    });
  });

  describe('createFromRequest', () => {
    it('should create tank strategy from tank transaction request', () => {
      const tankRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 2,
        userId: 1,
      };

      const strategy = factory.createFromRequest(tankRequest);
      expect(strategy).toBeDefined();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should create item strategy from item transaction request', () => {
      const itemRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.PURCHASE,
        quantity: 5,
        userId: 1,
      };

      const strategy = factory.createFromRequest(itemRequest);
      expect(strategy).toBeDefined();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should throw error for request without tank or item identifiers', () => {
      const invalidRequest = {
        inventoryId: 1,
        transactionType: TransactionType.SALE,
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
      
      expect(types).toHaveLength(5);
      expect(types).toContain(TransactionType.SALE);
      expect(types).toContain(TransactionType.PURCHASE);
      expect(types).toContain(TransactionType.RETURN);
      expect(types).toContain(TransactionType.TRANSFER);
      expect(types).toContain(TransactionType.ASSIGNMENT);
    });

    it('should return all supported transaction types for items', () => {
      const types = factory.getSupportedTransactionTypes('item');
      
      expect(types).toHaveLength(5);
      expect(types).toContain(TransactionType.SALE);
      expect(types).toContain(TransactionType.PURCHASE);
      expect(types).toContain(TransactionType.RETURN);
      expect(types).toContain(TransactionType.TRANSFER);
      expect(types).toContain(TransactionType.ASSIGNMENT);
    });
  });

  describe('isTransactionTypeSupported', () => {
    it('should return true for supported transaction types', () => {
      expect(factory.isTransactionTypeSupported(TransactionType.SALE, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionType.PURCHASE, 'tank')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionType.RETURN, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionType.TRANSFER, 'item')).toBe(true);
      expect(factory.isTransactionTypeSupported(TransactionType.ASSIGNMENT, 'tank')).toBe(true);
    });

    it('should return false for unsupported transaction types', () => {
      expect(factory.isTransactionTypeSupported('invalid' as any, 'tank')).toBe(false);
      expect(factory.isTransactionTypeSupported('invalid' as any, 'item')).toBe(false);
    });
  });

  describe('Strategy Consistency', () => {
    it('should create different strategy instances for different transaction types', () => {
      const saleStrategy = factory.create(TransactionType.SALE, 'tank');
      const purchaseStrategy = factory.create(TransactionType.PURCHASE, 'tank');
      
      expect(saleStrategy).not.toBe(purchaseStrategy);
    });

    it('should create different strategy instances for different entity types', () => {
      const tankStrategy = factory.create(TransactionType.SALE, 'tank');
      const itemStrategy = factory.create(TransactionType.SALE, 'item');
      
      expect(tankStrategy).not.toBe(itemStrategy);
    });

    it('should create new instances on each call', () => {
      const strategy1 = factory.create(TransactionType.SALE, 'tank');
      const strategy2 = factory.create(TransactionType.SALE, 'tank');
      
      // Factory should create new instances, not singletons
      expect(strategy1).not.toBe(strategy2);
    });
  });
});