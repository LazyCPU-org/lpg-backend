import type {
  AssignmentTankType,
  AssignmentTankWithDetails,
} from "../../dtos/response/inventoryAssignmentInterface";

// Transaction type for dependency injection
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

export abstract class ITankAssignmentRepository {
  // Find operations
  abstract findByInventoryId(
    inventoryId: number
  ): Promise<AssignmentTankType[]>;

  abstract findByInventoryIdWithDetails(
    inventoryId: number
  ): Promise<AssignmentTankWithDetails[]>;

  // Create operations
  abstract create(
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType>;

  // Create with transaction support
  abstract createWithTransaction(
    trx: DbTransaction,
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType>;

  abstract createOrFind(
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType>;

  // Update operations
  abstract update(
    inventoryId: number,
    tankTypeId: number,
    data: {
      purchase_price?: string;
      sell_price?: string;
      assignedFullTanks?: number;
      assignedEmptyTanks?: number;
      currentFullTanks?: number;
      currentEmptyTanks?: number;
    }
  ): Promise<AssignmentTankType>;

  abstract updateBatch(
    inventoryId: number,
    tanks: {
      tankTypeId: number;
      purchase_price: string;
      sell_price: string;
      assignedFullTanks: number;
      assignedEmptyTanks: number;
    }[]
  ): Promise<AssignmentTankType[]>;

  // Delete operations (for completeness)
  abstract delete(inventoryId: number, tankTypeId: number): Promise<boolean>;
}
