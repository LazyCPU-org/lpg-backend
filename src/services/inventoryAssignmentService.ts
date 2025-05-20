import {
  InventoryAssignmentType,
  InventoryAssignmentWithDetails,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";
import { InventoryAssignmentRepository } from "../repositories/inventoryAssignmentRepository";

export interface IInventoryAssignmentService {
  findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: string
  ): Promise<InventoryAssignmentType[]>;

  findAssignmentById(id: number): Promise<InventoryAssignmentWithDetails>;

  createNewAssignment(
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
    status?: StatusType
  ): Promise<InventoryAssignmentType[]> {
    // Convert date string to Date object if provided
    const dateObj = !date ? new Date().toISOString() : date;
    return await this.inventoryAssignmentRepository.find(
      userId,
      storeId,
      dateObj,
      status
    );
  }

  async findAssignmentById(
    id: number
  ): Promise<InventoryAssignmentWithDetails> {
    return await this.inventoryAssignmentRepository.findById(id);
  }

  async createNewAssignment(
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

    // Create the base assignment
    const assignment = await this.inventoryAssignmentRepository.create(
      assignmentId,
      dateObj,
      assignedBy,
      notes
    );

    // Create tank assignments
    const tankPromises = tanks.map((tank) =>
      this.inventoryAssignmentRepository.createTankAssignment(
        assignment.inventoryId,
        tank.tankTypeId,
        tank.purchase_price,
        tank.sell_price,
        tank.assignedFullTanks,
        tank.assignedEmptyTanks
      )
    );

    // Create item assignments
    const itemPromises = items.map((item) =>
      this.inventoryAssignmentRepository.createItemAssignment(
        assignment.inventoryId,
        item.inventoryItemId,
        item.purchase_price,
        item.sell_price,
        item.assignedItems
      )
    );

    // Wait for all assignments to be created
    await Promise.all([...tankPromises, ...itemPromises]);

    // Return the full assignment with details
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
