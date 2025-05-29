import type {
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  StatusType,
} from "../../dtos/response/inventoryAssignmentInterface";

export abstract class IInventoryAssignmentRepository {
  // Core CRUD operations
  abstract find(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithRelations[]>;

  abstract findById(
    inventoryId: number
  ): Promise<InventoryAssignmentType | null>;

  abstract findByIdWithRelations(
    inventoryId: number,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  abstract findByAssignmentId(
    assignmentId: number
  ): Promise<InventoryAssignmentType | null>;

  // Create operations
  abstract create(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string,
    autoAssignment?: boolean
  ): Promise<InventoryAssignmentType>;

  // Update operations
  abstract updateStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType>;

  // Utility methods
  abstract validateStatusTransition(
    currentStatus: string | null,
    newStatus: string
  ): boolean;
}
