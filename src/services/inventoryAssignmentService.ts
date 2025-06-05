// src/services/inventoryAssignmentService.ts - Enhanced with consolidation workflow
import { eq } from "drizzle-orm";
import { db } from "../db";
import { AssignmentStatusEnum } from "../db/schemas/inventory";
import { storeAssignments } from "../db/schemas/locations";
import {
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";
import {
  ConsolidationWorkflow,
  IConsolidationWorkflow,
  IInventoryAssignmentRepository,
  IInventoryTransactionRepository,
  IItemAssignmentRepository,
  ITankAssignmentRepository,
  TransactionTypeEnum,
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

  // Create methods
  createInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  createOrGetTodaysInventory(
    assignmentId: number,
    assignedBy: number
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  // Status update methods
  updateAssignmentStatus(
    id: number,
    status: string,
    userId: number
  ): Promise<InventoryAssignmentType>;

  // Consolidation workflow
  consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends?: boolean
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }>;

  // Transaction-based updates
  deliveryOut(
    inventoryId: number,
    userId: number,
    items: {
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      referenceId?: number;
    }[]
  ): Promise<void>;

  deliveryReturn(
    inventoryId: number,
    userId: number,
    items: {
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      isEmpty?: boolean;
      referenceId?: number;
    }[]
  ): Promise<void>;

  stockAdjustment(
    inventoryId: number,
    userId: number,
    adjustments: {
      tankTypeId?: number;
      inventoryItemId?: number;
      currentQuantity: number;
      adjustedQuantity: number;
      reason: string;
    }[]
  ): Promise<void>;
}

export class InventoryAssignmentService implements IInventoryAssignmentService {
  private consolidationWorkflow: IConsolidationWorkflow;

  constructor(
    private inventoryAssignmentRepository: IInventoryAssignmentRepository,
    private tankAssignmentRepository: ITankAssignmentRepository,
    private itemAssignmentRepository: IItemAssignmentRepository,
    private inventoryTransactionRepository: IInventoryTransactionRepository
  ) {
    this.consolidationWorkflow = new ConsolidationWorkflow(
      inventoryAssignmentRepository,
      tankAssignmentRepository,
      itemAssignmentRepository
    );
  }

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
   * Creates a new inventory assignment with catalog data
   */
  async createInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    const dateObj = assignmentDate || new Date().toISOString().split("T")[0];

    // Create base assignment
    const baseAssignment = await this.inventoryAssignmentRepository.create(
      assignmentId,
      dateObj,
      assignedBy,
      notes,
      true
    );

    // Get store catalog
    const storeAssignment = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.assignmentId, assignmentId),
      with: {
        store: {
          with: {
            itemsCatalog: { with: { inventoryItem: true } },
            tanksCatalog: { with: { tankType: true } },
          },
        },
      },
    });

    if (!storeAssignment?.store) {
      throw new NotFoundError("Asignación de tienda no encontrada");
    }

    const { itemsCatalog, tanksCatalog } = storeAssignment.store;

    // Create assignments with 0 initial quantities
    const [tankAssignments, itemAssignments] = await Promise.all([
      Promise.all(
        tanksCatalog.map((catalogTank) =>
          this.tankAssignmentRepository.create(
            baseAssignment.inventoryId,
            catalogTank.tankType.typeId,
            catalogTank.tankType.purchase_price || "0.00",
            catalogTank.tankType.sell_price || "0.00",
            0,
            0 // Start with 0 quantities
          )
        )
      ),
      Promise.all(
        itemsCatalog.map((catalogItem) =>
          this.itemAssignmentRepository.create(
            baseAssignment.inventoryId,
            catalogItem.inventoryItem.inventoryItemId,
            catalogItem.inventoryItem.purchase_price || "0.00",
            catalogItem.inventoryItem.sell_price || "0.00",
            0 // Start with 0 quantity
          )
        )
      ),
    ]);

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

  /**
   * Creates inventory for today if it doesn't exist, or returns existing one
   * Prevents duplicate daily inventories
   */
  async createOrGetTodaysInventory(
    assignmentId: number,
    assignedBy: number
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    const today = new Date().toISOString().split("T")[0];

    // Check if inventory already exists for today
    const existingInventory =
      await this.inventoryAssignmentRepository.findByAssignmentAndDate(
        assignmentId,
        today
      );

    if (existingInventory) {
      // Return existing inventory with details
      return await this.inventoryAssignmentRepository.findByIdWithRelations(
        existingInventory.inventoryId
      );
    }

    // Create new inventory for today
    return await this.createInventoryAssignment(
      assignmentId,
      today,
      assignedBy,
      "Inventario creado para la fecha de hoy"
    );
  }

  /**
   * Updates assignment status with enhanced business logic
   */
  async updateAssignmentStatus(
    inventoryAssignmentId: number,
    status: string,
    userId: number
  ): Promise<InventoryAssignmentType> {
    // Special handling for CONSOLIDATED status - triggers next day creation
    if (status === AssignmentStatusEnum.CONSOLIDATED) {
      const result = await this.consolidateAndCreateNext(
        inventoryAssignmentId,
        userId
      );
      return result.currentInventory;
    }

    // Standard status update for other transitions
    return await this.inventoryAssignmentRepository.updateStatus(
      inventoryAssignmentId,
      status as StatusType
    );
  }

  /**
   * Consolidates current inventory and creates next day with carried quantities
   */
  async consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends = false
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }> {
    return await this.consolidationWorkflow.consolidateAndCreateNext(
      inventoryId,
      userId,
      skipWeekends
    );
  }

  // Transaction-based business operations

  async deliveryOut(
    inventoryId: number,
    userId: number,
    items: {
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      referenceId?: number;
    }[]
  ): Promise<void> {
    const tankTransactions = items
      .filter((item) => item.tankTypeId)
      .map((item) => ({
        tankTypeId: item.tankTypeId!,
        fullTanksChange: -item.quantity, // Negative for delivery out
        emptyTanksChange: 0,
        transactionType: TransactionTypeEnum.SALE,
        userId,
        notes: `Entrega realizada: ${item.quantity} tanques`,
        referenceId: item.referenceId,
      }));

    const itemTransactions = items
      .filter((item) => item.inventoryItemId)
      .map((item) => ({
        inventoryItemId: item.inventoryItemId!,
        itemChange: -item.quantity, // Negative for delivery out
        transactionType: TransactionTypeEnum.SALE,
        userId,
        notes: `Entrega realizada: ${item.quantity} artículos`,
      }));

    await Promise.all([
      this.inventoryTransactionRepository.processTankTransactions(
        inventoryId,
        tankTransactions,
        true
      ),
      this.inventoryTransactionRepository.processItemTransactions(
        inventoryId,
        itemTransactions,
        true
      ),
    ]);
  }

  async deliveryReturn(
    inventoryId: number,
    userId: number,
    items: {
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      isEmpty?: boolean;
      referenceId?: number;
    }[]
  ): Promise<void> {
    const tankTransactions = items
      .filter((item) => item.tankTypeId)
      .map((item) => ({
        tankTypeId: item.tankTypeId!,
        fullTanksChange: item.isEmpty ? 0 : item.quantity,
        emptyTanksChange: item.isEmpty ? item.quantity : 0,
        transactionType: TransactionTypeEnum.RETURN,
        userId,
        notes: `Devolución: ${item.quantity} tanques ${
          item.isEmpty ? "vacíos" : "llenos"
        }`,
        referenceId: item.referenceId,
      }));

    const itemTransactions = items
      .filter((item) => item.inventoryItemId)
      .map((item) => ({
        inventoryItemId: item.inventoryItemId!,
        itemChange: item.quantity, // Positive for return
        transactionType: TransactionTypeEnum.RETURN,
        userId,
        notes: `Devolución: ${item.quantity} artículos`,
      }));

    await Promise.all([
      this.inventoryTransactionRepository.processTankTransactions(
        inventoryId,
        tankTransactions,
        true
      ),
      this.inventoryTransactionRepository.processItemTransactions(
        inventoryId,
        itemTransactions,
        true
      ),
    ]);
  }

  async stockAdjustment(
    inventoryId: number,
    userId: number,
    adjustments: {
      tankTypeId?: number;
      inventoryItemId?: number;
      currentQuantity: number;
      adjustedQuantity: number;
      reason: string;
    }[]
  ): Promise<void> {
    for (const adjustment of adjustments) {
      const difference =
        adjustment.adjustedQuantity - adjustment.currentQuantity;

      if (adjustment.tankTypeId && difference !== 0) {
        if (difference > 0) {
          await this.inventoryTransactionRepository.incrementTankByInventoryId(
            inventoryId,
            adjustment.tankTypeId,
            difference,
            0,
            TransactionTypeEnum.PURCHASE,
            userId,
            `Ajuste de inventario: ${adjustment.reason}`
          );
        } else {
          await this.inventoryTransactionRepository.decrementTankByInventoryId(
            inventoryId,
            adjustment.tankTypeId,
            Math.abs(difference),
            0,
            TransactionTypeEnum.PURCHASE,
            userId,
            `Ajuste de inventario: ${adjustment.reason}`
          );
        }
      }

      if (adjustment.inventoryItemId && difference !== 0) {
        if (difference > 0) {
          await this.inventoryTransactionRepository.incrementItemByInventoryId(
            inventoryId,
            adjustment.inventoryItemId,
            difference,
            TransactionTypeEnum.PURCHASE,
            userId,
            `Ajuste de inventario: ${adjustment.reason}`
          );
        } else {
          await this.inventoryTransactionRepository.decrementItemByInventoryId(
            inventoryId,
            adjustment.inventoryItemId,
            Math.abs(difference),
            TransactionTypeEnum.PURCHASE,
            userId,
            `Ajuste de inventario: ${adjustment.reason}`
          );
        }
      }
    }
  }
}
