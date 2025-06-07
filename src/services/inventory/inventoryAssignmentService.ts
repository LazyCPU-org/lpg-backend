import { eq } from "drizzle-orm";
import { db } from "../../db";
import { inventoryStatusHistory } from "../../db/schemas/audit/inventory-status-history";
import { AssignmentStatusEnum } from "../../db/schemas/inventory";
import {
  storeAssignmentCurrentInventory,
  storeAssignments,
} from "../../db/schemas/locations";
import {
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  StatusType,
} from "../../dtos/response/inventoryAssignmentInterface";
import {
  ConsolidationWorkflow,
  IConsolidationWorkflow,
  IInventoryAssignmentRepository,
  IInventoryTransactionRepository,
  IItemAssignmentRepository,
  ITankAssignmentRepository,
  TransactionTypeEnum,
} from "../../repositories/inventory";
import { NotFoundError } from "../../utils/custom-errors";
import { IInventoryDateService } from "./inventoryDateService";

export abstract class IInventoryAssignmentService {
  // Find methods
  abstract findAssignments(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: string,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithRelations[]>;

  abstract findAssignmentById(
    id: number,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  // Create methods
  abstract createInventoryAssignment(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  abstract createOrGetTodaysInventory(
    assignmentId: number,
    assignedBy: number
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  // Status update methods
  abstract updateAssignmentStatus(
    id: number,
    status: string,
    userId: number
  ): Promise<InventoryAssignmentType>;

  // Consolidation workflow
  abstract consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends?: boolean
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }>;

  // Transaction-based updates
  abstract deliveryOut(
    inventoryId: number,
    userId: number,
    items: {
      tankTypeId?: number;
      inventoryItemId?: number;
      quantity: number;
      referenceId?: number;
    }[]
  ): Promise<void>;

  abstract deliveryReturn(
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

  abstract stockAdjustment(
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
    private inventoryTransactionRepository: IInventoryTransactionRepository,
    private inventoryDateService: IInventoryDateService
  ) {
    this.consolidationWorkflow = new ConsolidationWorkflow(
      inventoryAssignmentRepository,
      tankAssignmentRepository,
      itemAssignmentRepository,
      inventoryDateService
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

    // Log initial status creation
    await this.createStatusHistoryRecord(
      baseAssignment.inventoryId,
      null, // fromStatus is null for initial creation
      baseAssignment.status as StatusType,
      assignedBy,
      "Inventario creado",
      "Asignación inicial de inventario creada automáticamente"
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

    // Set this inventory as the current inventory for the store assignment
    await this.setCurrentInventory(
      assignmentId,
      baseAssignment.inventoryId,
      assignedBy
    );

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
   * Updates assignment status with enhanced business logic and audit trail
   */
  async updateAssignmentStatus(
    inventoryAssignmentId: number,
    status: string,
    userId: number
  ): Promise<InventoryAssignmentType> {
    // Get current assignment to track from status
    const currentAssignment = await this.inventoryAssignmentRepository.findById(
      inventoryAssignmentId
    );

    if (!currentAssignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    const fromStatus = currentAssignment.status as StatusType;
    const toStatus = status as StatusType;

    // Special handling for CONSOLIDATED status - triggers next day creation
    if (status === AssignmentStatusEnum.CONSOLIDATED) {
      const result = await this.consolidateAndCreateNext(
        inventoryAssignmentId,
        userId
      );

      // Create status history record for validation and consolidation
      await this.createStatusHistoryRecord(
        inventoryAssignmentId,
        fromStatus,
        toStatus,
        userId,
        "Consolidación automática",
        this.generateStatusChangeNotes(fromStatus, toStatus, {
          isAutoConsolidation: true,
          inventoryDate: currentAssignment.assignmentDate,
        })
      );

      return result.currentInventory;
    }

    // Standard status update for other transitions
    const updatedAssignment =
      await this.inventoryAssignmentRepository.updateStatus(
        inventoryAssignmentId,
        toStatus
      );

    // Create status history record
    await this.createStatusHistoryRecord(
      inventoryAssignmentId,
      fromStatus,
      toStatus,
      userId,
      "Actualización manual de estado",
      this.generateStatusChangeNotes(fromStatus, toStatus)
    );

    return updatedAssignment;
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

  /**
   * Sets the current inventory for a store assignment
   */
  private async setCurrentInventory(
    assignmentId: number,
    inventoryId: number,
    setBy: number
  ): Promise<void> {
    // Check if current inventory state already exists
    const existingState =
      await db.query.storeAssignmentCurrentInventory.findFirst({
        where: eq(storeAssignmentCurrentInventory.assignmentId, assignmentId),
      });

    if (existingState) {
      // Update existing current inventory state
      await db
        .update(storeAssignmentCurrentInventory)
        .set({
          currentInventoryId: inventoryId,
          setAt: new Date(),
          setBy: setBy,
        })
        .where(eq(storeAssignmentCurrentInventory.assignmentId, assignmentId));
    } else {
      // Create new current inventory state
      await db.insert(storeAssignmentCurrentInventory).values({
        assignmentId,
        currentInventoryId: inventoryId,
        setBy: setBy,
      });
    }
  }

  /**
   * Creates a status history record for audit trail
   */
  private async createStatusHistoryRecord(
    inventoryId: number,
    fromStatus: StatusType | null,
    toStatus: StatusType,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    await db.insert(inventoryStatusHistory).values({
      inventoryId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      notes,
    });
  }

  /**
   * Generates appropriate notes based on status transition and context
   */
  private generateStatusChangeNotes(
    fromStatus: StatusType | null,
    toStatus: StatusType,
    context?: {
      isAutoConsolidation?: boolean;
      inventoryDate?: string;
      isStaleInventory?: boolean;
    }
  ): string {
    const transitions: Record<string, string> = {
      // Initial creation
      null_created: "Inventario creado con cantidades iniciales en cero",
      null_assigned: "Inventario creado y asignado directamente",

      // Normal workflow
      created_assigned: "Inventario asignado para operaciones del día",
      assigned_consolidated: "Inventario consolidado - ciclo diario completado",
      consolidated_verified: "Inventario verificado y aprobado por supervisor",

      // Emergency/manual transitions
      created_consolidated:
        "Consolidación directa - saltando asignación normal",
      assigned_verified: "Verificación directa - saltando consolidación",
      created_verified: "Verificación directa desde creación",

      // Reverse transitions (corrections)
      consolidated_assigned: "Reversión de consolidación - requiere ajustes",
      verified_consolidated: "Reversión de verificación - requiere revisión",
      verified_assigned: "Reversión completa - regreso a estado asignado",
    };

    const transitionKey = `${fromStatus || "null"}_${toStatus}`;
    let baseNote =
      transitions[transitionKey] ||
      `Cambio de estado de ${fromStatus || "inicial"} a ${toStatus}`;

    // Add context-specific information
    if (context?.isAutoConsolidation) {
      const currentDate = new Date().toISOString().split("T")[0];
      const inventoryDate = context.inventoryDate;

      if (inventoryDate && inventoryDate !== currentDate) {
        const daysDiff =
          Math.abs(
            new Date(currentDate).getTime() - new Date(inventoryDate).getTime()
          ) /
          (1000 * 60 * 60 * 24);

        if (daysDiff >= 1) {
          baseNote += ` | Recuperación de workflow: fecha original ${inventoryDate}, consolidado en ${currentDate}. Próximo inventario creado para HOY para operaciones inmediatas.`;
        }
      }
    }

    return baseNote;
  }

  // Transaction-based business operations (unchanged)

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
