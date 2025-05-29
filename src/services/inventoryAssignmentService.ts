import { eq } from "drizzle-orm";
import { db } from "../db";
import { storeAssignments } from "../db/schemas/locations";
import {
  AssignmentItemType,
  AssignmentTankType,
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";
import {
  IInventoryAssignmentRepository,
  IItemAssignmentRepository,
  ITankAssignmentRepository,
} from "../repositories/inventory";
import { NotFoundError } from "../utils/custom-errors";

export interface IInventoryAssignmentService {
  // Find methods
  findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: string,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithRelations[]>;

  findAssignmentById(
    id: number,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  // Create method - creates assignment with catalog data
  createInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  // Update methods for PATCH operations
  updateTankAssignments(
    inventoryId: number,
    tanks: {
      tankTypeId: number;
      purchase_price: string;
      sell_price: string;
      assignedFullTanks: number;
      assignedEmptyTanks: number;
    }[]
  ): Promise<AssignmentTankType[]>;

  updateItemAssignments(
    inventoryId: number,
    items: {
      inventoryItemId: number;
      purchase_price: string;
      sell_price: string;
      assignedItems: number;
    }[]
  ): Promise<AssignmentItemType[]>;

  updateInventoryAssignments(
    inventoryId: number,
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
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  updateAssignmentStatus(
    id: number,
    status: string
  ): Promise<InventoryAssignmentType>;
}

export class InventoryAssignmentService implements IInventoryAssignmentService {
  constructor(
    private inventoryAssignmentRepository: IInventoryAssignmentRepository,
    private tankAssignmentRepository: ITankAssignmentRepository,
    private itemAssignmentRepository: IItemAssignmentRepository
  ) {}

  async findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithRelations[]> {
    const dateObj = date || new Date().toISOString().split("T")[0];

    return await this.inventoryAssignmentRepository.find(
      userId,
      storeId,
      dateObj,
      status,
      relations
    );
  }

  async findAssignmentById(
    id: number,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    return await this.inventoryAssignmentRepository.findByIdWithRelations(
      id,
      relations
    );
  }

  /**
   * Creates a new inventory assignment and populates it with store catalog data
   * This is the main POST operation implementation
   */
  async createInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    const dateObj = assignmentDate || new Date().toISOString().split("T")[0];

    // Step 1: Create the base inventory assignment
    const baseAssignment = await this.inventoryAssignmentRepository.create(
      assignmentId,
      dateObj,
      assignedBy,
      notes,
      true // autoAssignment = true for catalog-based creation
    );

    // Step 2: Get the store information and its catalog from the assignment
    const storeAssignment = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.assignmentId, assignmentId),
      with: {
        store: {
          with: {
            // Get the store's catalog items and tank types
            itemsCatalog: {
              with: {
                inventoryItem: true,
              },
            },
            tanksCatalog: {
              with: {
                tankType: true,
              },
            },
          },
        },
      },
    });

    if (!storeAssignment?.store) {
      throw new NotFoundError("Asignación de tienda no encontrada");
    }

    const { itemsCatalog, tanksCatalog } = storeAssignment.store;

    // Step 3: Create tank assignments with 0 initial quantities from store catalog
    const tankPromises = tanksCatalog.map((catalogTank) =>
      this.tankAssignmentRepository.create(
        baseAssignment.inventoryId,
        catalogTank.tankType.typeId,
        catalogTank.tankType.purchase_price || "0.00", // Use catalog price as default
        catalogTank.tankType.sell_price || "0.00", // Use catalog price as default
        0, // assignedFullTanks
        0 // assignedEmptyTanks
      )
    );

    // Step 4: Create item assignments with 0 initial quantities from store catalog
    const itemPromises = itemsCatalog.map((catalogItem) =>
      this.itemAssignmentRepository.create(
        baseAssignment.inventoryId,
        catalogItem.inventoryItem.inventoryItemId,
        catalogItem.inventoryItem.purchase_price || "0.00", // Use catalog price as default
        catalogItem.inventoryItem.sell_price || "0.00", // Use catalog price as default
        0 // assignedItems
      )
    );

    // Step 5: Execute all assignments in parallel
    const [tankAssignments, itemAssignments] = await Promise.all([
      Promise.all(tankPromises),
      Promise.all(itemPromises),
    ]);

    // Step 6: Return the complete assignment with populated data
    return {
      ...baseAssignment,
      tanks: tankAssignments.map((ta) => ({
        ...ta,
        tankDetails: tanksCatalog.find(
          (ct) => ct.tankType.typeId === ta.tankTypeId
        )?.tankType!,
      })),
      items: itemAssignments.map((ia) => ({
        ...ia,
        itemDetails: itemsCatalog.find(
          (ci) => ci.inventoryItem.inventoryItemId === ia.inventoryItemId
        )?.inventoryItem!,
      })),
    };
  }

  async updateTankAssignments(
    inventoryId: number,
    tanks: {
      tankTypeId: number;
      purchase_price: string;
      sell_price: string;
      assignedFullTanks: number;
      assignedEmptyTanks: number;
    }[]
  ): Promise<AssignmentTankType[]> {
    return await this.tankAssignmentRepository.updateBatch(inventoryId, tanks);
  }

  async updateItemAssignments(
    inventoryId: number,
    items: {
      inventoryItemId: number;
      purchase_price: string;
      sell_price: string;
      assignedItems: number;
    }[]
  ): Promise<AssignmentItemType[]> {
    return await this.itemAssignmentRepository.updateBatch(inventoryId, items);
  }

  async updateInventoryAssignments(
    inventoryId: number,
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
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // Update tanks and items in parallel
    await Promise.all([
      this.updateTankAssignments(inventoryId, tanks),
      this.updateItemAssignments(inventoryId, items),
    ]);

    // Return the updated assignment with details
    return await this.inventoryAssignmentRepository.findByIdWithRelations(
      inventoryId
    );
  }

  async updateAssignmentStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType> {
    return await this.inventoryAssignmentRepository.updateStatus(id, status);
  }
}
