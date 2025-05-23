import {
  AssignmentItemType,
  AssignmentTankType,
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetails,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";
import { InventoryAssignmentRepository } from "../repositories/inventoryAssignmentRepository";

export interface IInventoryAssignmentService {
  findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: string,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentType[]>;

  // Updated method signature to accept relations
  findAssignmentById(
    id: number,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  createNewInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes: string | undefined,
    tanks:
      | {
          tankTypeId: number;
          purchase_price: string;
          sell_price: string;
          assignedFullTanks: number;
          assignedEmptyTanks: number;
        }[]
      | undefined,
    items:
      | {
          inventoryItemId: number;
          purchase_price: string;
          sell_price: string;
          assignedItems: number;
        }[]
      | undefined
  ): Promise<InventoryAssignmentWithDetails>;

  updateAssignmentStatus(
    id: number,
    status: string
  ): Promise<InventoryAssignmentType>;
}

export class InventoryAssignmentService implements IInventoryAssignmentService {
  private inventoryAssignmentRepository: InventoryAssignmentRepository;

  constructor(inventoryAssignmentRepository: InventoryAssignmentRepository) {
    this.inventoryAssignmentRepository = inventoryAssignmentRepository;
  }

  async findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithRelations[]> {
    // Convert date string to Date object if provided
    const dateObj = !date ? new Date().toISOString() : date;
    return await this.inventoryAssignmentRepository.find(
      userId,
      storeId,
      dateObj,
      status,
      relations
    );
  }

  // Updated implementation to accept relations
  async findAssignmentById(
    id: number,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    return await this.inventoryAssignmentRepository.findByIdWithRelations(
      id,
      relations
    );
  }

  async createNewInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes: string | undefined,
    tanks: {
      tankTypeId: number;
      purchase_price: string;
      sell_price: string;
      assignedFullTanks: number;
      assignedEmptyTanks: number;
    }[],
    items: {
      inventoryItemId: number;
      purchase_price: string;
      sell_price: string;
      assignedItems: number;
    }[]
  ): Promise<InventoryAssignmentWithDetails> {
    // Convert date string to Date object
    const dateObj = !assignmentDate ? new Date().toISOString() : assignmentDate;

    const foundAssignment =
      await this.inventoryAssignmentRepository.findByAssignmentId(assignmentId);

    // Create the base assignment, or just assign the found one if already exists
    const assignment =
      foundAssignment ??
      (await this.inventoryAssignmentRepository.create(
        assignmentId,
        dateObj,
        assignedBy,
        notes
      ));

    let tankPromises: Promise<AssignmentTankType>[] = [];
    let itemPromises: Promise<AssignmentItemType>[] = [];

    if (assignment) {
      // Create tank assignments
      if (tanks && tanks.length > 0) {
        tankPromises = tanks.map((tank) =>
          this.inventoryAssignmentRepository.createOrFindTankAssignment(
            assignment.inventoryId,
            tank.tankTypeId,
            tank.purchase_price,
            tank.sell_price,
            tank.assignedFullTanks,
            tank.assignedEmptyTanks
          )
        );
      }

      if (items && items.length > 0) {
        // Create item assignments
        itemPromises = items.map((item) =>
          this.inventoryAssignmentRepository.createOrFindItemAssignment(
            assignment.inventoryId,
            item.inventoryItemId,
            item.purchase_price,
            item.sell_price,
            item.assignedItems
          )
        );
      }

      // Wait for all assignments to be created
      await Promise.all([...tankPromises, ...itemPromises]);
    }

    // Return the full assignment with details (keeping original behavior)
    return await this.inventoryAssignmentRepository.findById(
      assignment.inventoryId
    );
  }

  async updateAssignmentStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType> {
    return await this.inventoryAssignmentRepository.updateStatus(id, status);
  }
}
