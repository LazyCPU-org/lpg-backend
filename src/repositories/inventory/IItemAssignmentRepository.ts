import type { AssignmentItemType } from "../../dtos/response/inventoryAssignmentInterface";

// Transaction type for dependency injection
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

export abstract class IItemAssignmentRepository {
  // Find operations
  abstract findByInventoryId(
    inventoryId: number
  ): Promise<AssignmentItemType[]>;

  abstract findByInventoryIdWithDetails(
    inventoryId: number
  ): Promise<(AssignmentItemType & { itemDetails: any })[]>;

  // Create operations
  abstract create(
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType>;

  // Create with transaction support
  abstract createWithTransaction(
    trx: DbTransaction,
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType>;

  abstract createOrFind(
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType>;

  // Update operations
  abstract update(
    inventoryId: number,
    inventoryItemId: number,
    data: {
      purchase_price?: string;
      sell_price?: string;
      assignedItems?: number;
      currentItems?: number;
    }
  ): Promise<AssignmentItemType>;

  abstract updateBatch(
    inventoryId: number,
    items: {
      inventoryItemId: number;
      purchase_price: string;
      sell_price: string;
      assignedItems: number;
    }[]
  ): Promise<AssignmentItemType[]>;

  // Delete operations (for completeness)
  abstract delete(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<boolean>;
}
