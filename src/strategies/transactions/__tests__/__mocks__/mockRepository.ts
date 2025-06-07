import { IInventoryTransactionRepository } from '../../../../repositories/inventory';

export const createMockRepository = (): jest.Mocked<IInventoryTransactionRepository> => ({
  // Tank transaction methods
  incrementTankQuantity: jest.fn(),
  decrementTankQuantity: jest.fn(),
  
  // Item transaction methods
  incrementItemQuantity: jest.fn(),
  decrementItemQuantity: jest.fn(),
  
  // Convenience methods that work with inventoryId
  incrementTankByInventoryId: jest.fn(),
  decrementTankByInventoryId: jest.fn(),
  incrementItemByInventoryId: jest.fn(),
  decrementItemByInventoryId: jest.fn(),
  
  // Batch operations
  processTankTransactions: jest.fn(),
  processItemTransactions: jest.fn(),
  
  // Get current quantities
  getCurrentTankQuantities: jest.fn(),
  getCurrentItemQuantity: jest.fn(),
});