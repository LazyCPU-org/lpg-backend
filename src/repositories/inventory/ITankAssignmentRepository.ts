import type { AssignmentTankType } from "../../dtos/response/inventoryAssignmentInterface";

export abstract class ITankAssignmentRepository {
  // Find operations
  abstract findByInventoryId(
    inventoryId: number
  ): Promise<AssignmentTankType[]>;

  abstract findByInventoryIdWithDetails(
    inventoryId: number
  ): Promise<(AssignmentTankType & { tankDetails: any })[]>;

  // Create operations
  abstract create(
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
