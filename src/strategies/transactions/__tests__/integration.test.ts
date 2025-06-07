/**
 * Integration Tests for Transaction Strategy Pattern
 * 
 * Tests the integration between factory, strategies, and processor
 * without importing database schemas to avoid circular dependencies.
 */

import { TransactionStrategyFactory } from '../factory/TransactionStrategyFactory';
import { TransactionProcessor } from '../processor/TransactionProcessor';
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

describe('Transaction Strategy Integration', () => {
  let factory: TransactionStrategyFactory;
  let processor: TransactionProcessor;

  beforeEach(() => {
    factory = new TransactionStrategyFactory(mockRepository);
    processor = new TransactionProcessor(mockRepository);
    jest.clearAllMocks();
  });

  describe('Factory Integration', () => {
    it('should create functional strategies that can calculate changes', () => {
      // Test tank strategies
      const tankSaleStrategy = factory.create(TransactionType.SALE, 'tank');
      const tankPurchaseStrategy = factory.create(TransactionType.PURCHASE, 'tank');
      
      // Test item strategies
      const itemSaleStrategy = factory.create(TransactionType.SALE, 'item');
      const itemPurchaseStrategy = factory.create(TransactionType.PURCHASE, 'item');

      // Verify strategies can calculate changes
      const tankRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 5,
        userId: 1,
      };

      const itemRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.SALE,
        quantity: 3,
        userId: 1,
      };

      const tankChanges = tankSaleStrategy.calculateChanges(tankRequest);
      const itemChanges = itemSaleStrategy.calculateChanges(itemRequest);

      expect(tankChanges).toEqual({
        fullTanksChange: -5,
        emptyTanksChange: 5,
      });

      expect(itemChanges).toEqual({
        itemChange: -3,
      });
    });

    it('should create strategies with proper inheritance structure', () => {
      const saleStrategy = factory.create(TransactionType.SALE, 'tank');
      
      // Verify strategy has required methods
      expect(typeof saleStrategy.validateRequest).toBe('function');
      expect(typeof saleStrategy.calculateChanges).toBe('function');
      expect(typeof saleStrategy.execute).toBe('function');
    });
  });

  describe('Processor Integration', () => {
    it('should use factory to create strategies internally', () => {
      const tankRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.PURCHASE,
        quantity: 8,
        userId: 1,
      };

      const changes = processor.calculateTransactionChanges(tankRequest);

      expect(changes).toEqual({
        fullTanksChange: 8,
        emptyTanksChange: -8,
      });
    });

    it('should detect entity types correctly from requests', () => {
      const tankRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 3,
        userId: 1,
      };

      const itemRequest = {
        inventoryId: 1,
        inventoryItemId: 1,
        transactionType: TransactionType.PURCHASE,
        quantity: 10,
        userId: 1,
      };

      // Should not throw errors - indicates correct entity type detection
      expect(() => processor.calculateTransactionChanges(tankRequest)).not.toThrow();
      expect(() => processor.calculateTransactionChanges(itemRequest)).not.toThrow();

      const tankChanges = processor.calculateTransactionChanges(tankRequest);
      const itemChanges = processor.calculateTransactionChanges(itemRequest);

      // Verify correct strategy was selected based on request type
      expect('fullTanksChange' in tankChanges).toBe(true);
      expect('emptyTanksChange' in tankChanges).toBe(true);
      expect('itemChange' in itemChanges).toBe(true);
    });

    it('should get supported transaction types for both entity types', () => {
      const tankTypes = processor.getSupportedTransactionTypes('tank');
      const itemTypes = processor.getSupportedTransactionTypes('item');

      expect(tankTypes).toHaveLength(5);
      expect(itemTypes).toHaveLength(5);

      expect(tankTypes).toEqual(itemTypes); // Both should support same transaction types
      
      expect(tankTypes).toContain(TransactionType.SALE);
      expect(tankTypes).toContain(TransactionType.PURCHASE);
      expect(tankTypes).toContain(TransactionType.RETURN);
      expect(tankTypes).toContain(TransactionType.TRANSFER);
      expect(tankTypes).toContain(TransactionType.ASSIGNMENT);
    });
  });

  describe('Strategy Pattern Benefits', () => {
    it('should allow easy addition of new transaction types', () => {
      // This test verifies the extensibility of the pattern
      const supportedTypes = factory.getSupportedTransactionTypes('tank');
      
      // Current implementation supports 5 types
      expect(supportedTypes).toHaveLength(5);
      
      // New types could be added by:
      // 1. Adding to TransactionTypeEnum
      // 2. Creating new strategy class
      // 3. Adding case to factory
      // 4. No changes needed to existing code
    });

    it('should maintain separation of concerns between strategies', () => {
      const saleStrategy = factory.create(TransactionType.SALE, 'tank');
      const purchaseStrategy = factory.create(TransactionType.PURCHASE, 'tank');

      const saleRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.SALE,
        quantity: 5,
        userId: 1,
      };

      const purchaseRequest = {
        inventoryId: 1,
        tankTypeId: 1,
        transactionType: TransactionType.PURCHASE,
        quantity: 5,
        userId: 1,
      };

      const saleChanges = saleStrategy.calculateChanges(saleRequest);
      const purchaseChanges = purchaseStrategy.calculateChanges(purchaseRequest);

      // Strategies should produce different results for same quantity
      expect('fullTanksChange' in saleChanges && saleChanges.fullTanksChange).toBe(-5);
      expect('fullTanksChange' in purchaseChanges && purchaseChanges.fullTanksChange).toBe(5);
      
      // Each strategy encapsulates its own business logic
      expect(saleChanges).not.toEqual(purchaseChanges);
    });

    it('should provide consistent interface across all strategies', () => {
      const transactionTypes = [
        TransactionType.SALE,
        TransactionType.PURCHASE,
        TransactionType.RETURN,
        TransactionType.TRANSFER,
        TransactionType.ASSIGNMENT,
      ];

      const entityTypes = ['tank', 'item'] as const;

      transactionTypes.forEach(transactionType => {
        entityTypes.forEach(entityType => {
          const strategy = factory.create(transactionType, entityType);
          
          // All strategies should have the same interface
          expect(strategy).toHaveProperty('validateRequest');
          expect(strategy).toHaveProperty('calculateChanges');
          expect(strategy).toHaveProperty('execute');
          
          expect(typeof strategy.validateRequest).toBe('function');
          expect(typeof strategy.calculateChanges).toBe('function');
          expect(typeof strategy.execute).toBe('function');
        });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid entity types gracefully', () => {
      expect(() => {
        factory.create(TransactionType.SALE, 'invalid' as any);
      }).toThrow('Unsupported entity type: invalid');
    });

    it('should handle invalid transaction types gracefully', () => {
      expect(() => {
        factory.create('invalid' as any, 'tank');
      }).toThrow('Unsupported tank transaction type: invalid');
    });

    it('should handle malformed requests gracefully', () => {
      const malformedRequest = {
        inventoryId: 1,
        // Missing tankTypeId and inventoryItemId
        transactionType: TransactionType.SALE,
        quantity: 5,
        userId: 1,
      } as any;

      expect(() => {
        processor.calculateTransactionChanges(malformedRequest);
      }).toThrow('Cannot determine entity type from request');
    });
  });
});