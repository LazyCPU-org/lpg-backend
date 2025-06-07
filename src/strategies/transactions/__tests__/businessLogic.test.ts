/**
 * Business Logic Unit Tests
 * 
 * This test file focuses on testing the core business logic of transaction calculations
 * without importing database schemas to avoid circular dependencies.
 */

import { TankSaleStrategy, ItemSaleStrategy } from '../implementations/SaleTransactionStrategy';
import { TankPurchaseStrategy, ItemPurchaseStrategy } from '../implementations/PurchaseTransactionStrategy';
import { TankReturnStrategy, ItemReturnStrategy } from '../implementations/ReturnTransactionStrategy';
import { TankAssignmentStrategy, ItemAssignmentStrategy } from '../implementations/AssignmentTransactionStrategy';
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

describe('Transaction Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tank Business Logic', () => {
    describe('Sale Strategy - Tank Exchange Model', () => {
      it('should handle tank exchange correctly: customer takes full, returns empty', () => {
        const strategy = new TankSaleStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.SALE,
          quantity: 5,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: -5,  // Customer takes 5 full tanks
          emptyTanksChange: 5,  // Customer returns 5 empty tanks
        });
      });
    });

    describe('Purchase Strategy - Supplier Exchange Model', () => {
      it('should handle supplier exchange correctly: give empty, receive full', () => {
        const strategy = new TankPurchaseStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.PURCHASE,
          quantity: 10,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: 10,   // Receive 10 full tanks from supplier
          emptyTanksChange: -10, // Give 10 empty tanks to supplier
        });
      });
    });

    describe('Return Strategy - Specify Tank Type', () => {
      it('should handle full tank returns', () => {
        const strategy = new TankReturnStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.RETURN,
          quantity: 3,
          tankType: 'full' as const,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: 3,  // Customer returns 3 full tanks
          emptyTanksChange: 0,
        });
      });

      it('should handle empty tank returns', () => {
        const strategy = new TankReturnStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.RETURN,
          quantity: 7,
          tankType: 'empty' as const,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: 0,
          emptyTanksChange: 7,  // Customer returns 7 empty tanks
        });
      });
    });

    describe('Assignment Strategy - Direct Assignment', () => {
      it('should handle full tank assignments', () => {
        const strategy = new TankAssignmentStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.ASSIGNMENT,
          quantity: 20,
          tankType: 'full' as const,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: 20,  // Assign 20 full tanks
          emptyTanksChange: 0,
        });
      });

      it('should handle empty tank assignments', () => {
        const strategy = new TankAssignmentStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.ASSIGNMENT,
          quantity: 15,
          tankType: 'empty' as const,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          fullTanksChange: 0,
          emptyTanksChange: 15,  // Assign 15 empty tanks
        });
      });
    });
  });

  describe('Item Business Logic', () => {
    describe('Sale Strategy - Simple Reduction', () => {
      it('should reduce item quantity for sales', () => {
        const strategy = new ItemSaleStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.SALE,
          quantity: 8,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          itemChange: -8,  // Reduce 8 items
        });
      });
    });

    describe('Purchase Strategy - Simple Addition', () => {
      it('should increase item quantity for purchases', () => {
        const strategy = new ItemPurchaseStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.PURCHASE,
          quantity: 25,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          itemChange: 25,  // Add 25 items
        });
      });
    });

    describe('Return Strategy - Customer Returns Items', () => {
      it('should increase item quantity for returns', () => {
        const strategy = new ItemReturnStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.RETURN,
          quantity: 4,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          itemChange: 4,  // Add 4 returned items
        });
      });
    });

    describe('Assignment Strategy - Direct Assignment', () => {
      it('should increase item quantity for assignments', () => {
        const strategy = new ItemAssignmentStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.ASSIGNMENT,
          quantity: 50,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);

        expect(changes).toEqual({
          itemChange: 50,  // Assign 50 items
        });
      });
    });
  });

  describe('Business Rule Validation', () => {
    describe('Tank Business Rules', () => {
      it('should enforce tank exchange model for sales', () => {
        const strategy = new TankSaleStrategy(mockRepository);
        
        // Sales should always result in equal and opposite changes to full/empty tanks
        const saleRequest = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.SALE,
          quantity: 12,
          userId: 1,
        };

        const saleChanges = strategy.calculateChanges(saleRequest);
        
        // Verify exchange model: full tanks lost = empty tanks gained
        expect(saleChanges.fullTanksChange).toBe(-12);
        expect(saleChanges.emptyTanksChange).toBe(12);
        expect(saleChanges.fullTanksChange + saleChanges.emptyTanksChange).toBe(0); // Net tank change is 0
      });

      it('should enforce supplier exchange model for purchases', () => {
        const strategy = new TankPurchaseStrategy(mockRepository);
        
        // Purchases should also result in equal and opposite changes
        const purchaseRequest = {
          inventoryId: 1,
          tankTypeId: 1,
          transactionType: TransactionType.PURCHASE,
          quantity: 8,
          userId: 1,
        };

        const purchaseChanges = strategy.calculateChanges(purchaseRequest);
        
        // Verify exchange model: empty tanks lost = full tanks gained
        expect(purchaseChanges.fullTanksChange).toBe(8);
        expect(purchaseChanges.emptyTanksChange).toBe(-8);
        expect(purchaseChanges.fullTanksChange + purchaseChanges.emptyTanksChange).toBe(0); // Net tank change is 0
      });
    });

    describe('Item Business Rules', () => {
      it('should ensure sales reduce inventory', () => {
        const strategy = new ItemSaleStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.SALE,
          quantity: 15,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);
        
        expect(changes.itemChange).toBeLessThan(0); // Sales should always reduce inventory
        expect(changes.itemChange).toBe(-15);
      });

      it('should ensure purchases increase inventory', () => {
        const strategy = new ItemPurchaseStrategy(mockRepository);
        
        const request = {
          inventoryId: 1,
          inventoryItemId: 1,
          transactionType: TransactionType.PURCHASE,
          quantity: 30,
          userId: 1,
        };

        const changes = strategy.calculateChanges(request);
        
        expect(changes.itemChange).toBeGreaterThan(0); // Purchases should always increase inventory
        expect(changes.itemChange).toBe(30);
      });
    });
  });
});