import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { inventoryStatusHistory } from "../../db/schemas/audit/inventory-status-history";
import {
  assignmentItems,
  AssignmentStatusEnum,
  assignmentTanks,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import inventoryItem from "../../db/schemas/inventory/inventory-item";
import tankType from "../../db/schemas/inventory/tank-type";
import {
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  StatusType,
} from "../../dtos/response/inventoryAssignmentInterface";
import { IInventoryDateService } from "../../services/inventoryDateService";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import { IInventoryAssignmentRepository } from "./IInventoryAssignmentRepository";
import { IItemAssignmentRepository } from "./IItemAssignmentRepository";
import { ITankAssignmentRepository } from "./ITankAssignmentRepository";

// Simple approach: Extract the transaction type from the db.transaction callback
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export abstract class IConsolidationWorkflow {
  abstract consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends?: boolean
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }>;

  abstract createInventoryWithCarriedQuantities(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    carriedQuantities: {
      tanks: {
        tankTypeId: number;
        fullTanks: number;
        emptyTanks: number;
        purchase_price: string;
        sell_price: string;
      }[];
      items: {
        inventoryItemId: number;
        quantity: number;
        purchase_price: string;
        sell_price: string;
      }[];
    }
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;
}

export class ConsolidationWorkflow implements IConsolidationWorkflow {
  constructor(
    private inventoryAssignmentRepository: IInventoryAssignmentRepository,
    private tankAssignmentRepository: ITankAssignmentRepository,
    private itemAssignmentRepository: IItemAssignmentRepository,
    private inventoryDateService: IInventoryDateService
  ) {}

  async consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends = false
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }> {
    return await this.withTransaction(async (trx) => {
      // 1. Get current inventory and validate it can be consolidated
      const currentInventory = await trx.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
      });

      if (!currentInventory) {
        throw new NotFoundError("Asignación de inventario no encontrada");
      }

      // Validate current status allows consolidation
      if (
        currentInventory.status !== AssignmentStatusEnum.ASSIGNED &&
        currentInventory.status !== AssignmentStatusEnum.CREATED
      ) {
        throw new BadRequestError(
          `No se puede consolidar inventario con estado: ${currentInventory.status}. Debe estar en estado 'Creado' ó 'En Curso'.`
        );
      }

      // 2. Get current final quantities (what we'll carry over)
      const [currentTanks, currentItems] = await Promise.all([
        trx.query.assignmentTanks.findMany({
          where: eq(assignmentTanks.inventoryId, inventoryId),
          with: { tankType: true },
        }),
        trx.query.assignmentItems.findMany({
          where: eq(assignmentItems.inventoryId, inventoryId),
          with: { inventoryItem: true },
        }),
      ]);

      // 3. Calculate next working day - with smart date handling
      const nextDate = this.inventoryDateService.calculateNextInventoryDate(
        currentInventory.assignmentDate,
        skipWeekends
      );

      // Check if this is a stale inventory scenario
      const currentDate = this.inventoryDateService.getCurrentDateInTimezone();
      const isStaleInventory = this.inventoryDateService.isStaleInventory(
        currentInventory.assignmentDate,
        currentDate
      );

      // 4. Check if next day inventory already exists (prevent duplicates)
      const existingNextDay = await trx.query.inventoryAssignments.findFirst({
        where: and(
          eq(inventoryAssignments.assignmentId, currentInventory.assignmentId),
          eq(inventoryAssignments.assignmentDate, nextDate)
        ),
      });

      if (existingNextDay) {
        throw new BadRequestError(
          `Ya existe una asignación de inventario para la fecha ${nextDate}. No se puede crear automáticamente.`
        );
      }

      // 5. Update current inventory status to CONSOLIDATED
      const consolidatedInventory = await trx
        .update(inventoryAssignments)
        .set({
          status: AssignmentStatusEnum.CONSOLIDATED,
          updatedAt: new Date(),
        })
        .where(eq(inventoryAssignments.inventoryId, inventoryId))
        .returning();

      if (!consolidatedInventory || consolidatedInventory.length === 0) {
        throw new InternalError("Error actualizando estado de inventario");
      }

      // 6. Create status history record for consolidation with context
      await this.createStatusHistoryRecordInTransaction(
        trx,
        inventoryId,
        AssignmentStatusEnum.ASSIGNED as StatusType,
        AssignmentStatusEnum.CONSOLIDATED as StatusType,
        userId,
        "Consolidación automática del workflow",
        this.generateConsolidationNotes(
          currentInventory.assignmentDate,
          nextDate,
          isStaleInventory
        )
      );

      // 7. Prepare carried quantities (current becomes assigned for next day)
      // Filter out items/tanks that had 0 assigned AND 0 current quantities
      const carriedQuantities = {
        tanks: currentTanks
          .filter((tank) => {
            // Include tank if it had any assigned quantities OR any current quantities
            const hadAssignedQuantities =
              tank.assignedFullTanks > 0 || tank.assignedEmptyTanks > 0;
            const hasCurrentQuantities =
              tank.currentFullTanks > 0 || tank.currentEmptyTanks > 0;

            // Include if either assigned OR current had quantities (exclude only if BOTH are 0)
            return hadAssignedQuantities || hasCurrentQuantities;
          })
          .map((tank) => ({
            tankTypeId: tank.tankTypeId,
            fullTanks: tank.currentFullTanks,
            emptyTanks: tank.currentEmptyTanks,
            purchase_price: tank.purchase_price,
            sell_price: tank.sell_price,
          })),
        items: currentItems
          .filter((item) => {
            // Include item if it had any assigned quantity OR any current quantity
            const hadAssignedQuantity = item.assignedItems > 0;
            const hasCurrentQuantity = item.currentItems > 0;

            // Include if either assigned OR current had quantities (exclude only if BOTH are 0)
            return hadAssignedQuantity || hasCurrentQuantity;
          })
          .map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.currentItems,
            purchase_price: item.purchase_price,
            sell_price: item.sell_price,
          })),
      };

      // 8. Create next day inventory with carried quantities
      const nextDayInventory =
        await this.createInventoryWithCarriedQuantitiesInTransaction(
          trx,
          currentInventory.assignmentId,
          nextDate,
          userId,
          carriedQuantities,
          isStaleInventory
        );

      return {
        currentInventory: consolidatedInventory[0],
        nextDayInventory,
      };
    });
  }

  /**
   * Generate contextual notes for consolidation process
   */
  private generateConsolidationNotes(
    originalDate: string,
    nextDate: string,
    isStaleInventory: boolean
  ): string {
    let notes = `Inventario consolidado automáticamente. Próximo inventario programado para: ${nextDate}.`;

    if (isStaleInventory) {
      const currentDate = this.inventoryDateService.getCurrentDateInTimezone();
      notes += ` | RECUPERACIÓN DE WORKFLOW: Inventario rezagado (fecha original: ${originalDate}, consolidado: ${currentDate}). Próximo inventario creado para HOY para permitir operaciones inmediatas.`;
    }

    return notes;
  }

  async createInventoryWithCarriedQuantities(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    carriedQuantities: {
      tanks: {
        tankTypeId: number;
        fullTanks: number;
        emptyTanks: number;
        purchase_price: string;
        sell_price: string;
      }[];
      items: {
        inventoryItemId: number;
        quantity: number;
        purchase_price: string;
        sell_price: string;
      }[];
    }
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // This method is for external use (without transaction)
    return await this.withTransaction(async (trx) => {
      return await this.createInventoryWithCarriedQuantitiesInTransaction(
        trx,
        assignmentId,
        assignmentDate,
        assignedBy,
        carriedQuantities,
        false
      );
    });
  }

  // New private method that accepts transaction parameter
  private async createInventoryWithCarriedQuantitiesInTransaction(
    trx: DbTransaction,
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    carriedQuantities: {
      tanks: {
        tankTypeId: number;
        fullTanks: number;
        emptyTanks: number;
        purchase_price: string;
        sell_price: string;
      }[];
      items: {
        inventoryItemId: number;
        quantity: number;
        purchase_price: string;
        sell_price: string;
      }[];
    },
    isStaleRecovery: boolean = false
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // Create base inventory assignment (repository should accept transaction)
    const baseAssignment =
      await this.inventoryAssignmentRepository.createWithTransaction(
        trx,
        assignmentId,
        assignmentDate,
        assignedBy,
        isStaleRecovery
          ? "Inventario creado por recuperación de workflow rezagado"
          : "Inventario creado automáticamente por consolidación del día anterior",
        true // autoAssignment = true
      );

    // Create status history for the new inventory creation
    await this.createStatusHistoryRecordInTransaction(
      trx,
      baseAssignment.inventoryId,
      null, // fromStatus is null for new creation
      baseAssignment.status as StatusType,
      assignedBy,
      "Creación automática de inventario",
      isStaleRecovery
        ? `Inventario creado para fecha ${assignmentDate} como parte de recuperación de workflow rezagado. Cantidades iniciales basadas en consolidación anterior.`
        : `Inventario creado automáticamente para fecha ${assignmentDate} con cantidades heredadas del inventario consolidado anterior.`
    );

    // Create tank assignments with carried quantities
    const tankPromises = carriedQuantities.tanks.map((tank) =>
      this.tankAssignmentRepository.createWithTransaction(
        trx,
        baseAssignment.inventoryId,
        tank.tankTypeId,
        tank.purchase_price,
        tank.sell_price,
        tank.fullTanks, // assignedFullTanks = carried quantity
        tank.emptyTanks // assignedEmptyTanks = carried quantity
      )
    );

    // Create item assignments with carried quantities
    const itemPromises = carriedQuantities.items.map((item) =>
      this.itemAssignmentRepository.createWithTransaction(
        trx,
        baseAssignment.inventoryId,
        item.inventoryItemId,
        item.purchase_price,
        item.sell_price,
        item.quantity // assignedItems = carried quantity
      )
    );

    // Execute all assignments
    const [tankAssignments, itemAssignments] = await Promise.all([
      Promise.all(tankPromises),
      Promise.all(itemPromises),
    ]);

    // Fetch tank type details and item details using transaction queries
    const tankDetailsPromises = tankAssignments.map(async (ta) => {
      const tankTypeDetails = await trx.query.tankType.findFirst({
        where: eq(tankType.typeId, ta.tankTypeId),
      });
      return {
        ...ta,
        tankDetails: tankTypeDetails!,
      };
    });

    const itemDetailsPromises = itemAssignments.map(async (ia) => {
      const itemDetails = await trx.query.inventoryItem.findFirst({
        where: eq(inventoryItem.inventoryItemId, ia.inventoryItemId),
      });
      return {
        ...ia,
        itemDetails: itemDetails!,
      };
    });

    // Resolve all details
    const [tanksWithDetails, itemsWithDetails] = await Promise.all([
      Promise.all(tankDetailsPromises),
      Promise.all(itemDetailsPromises),
    ]);

    // Return complete assignment
    return {
      ...baseAssignment,
      tanks: tanksWithDetails,
      items: itemsWithDetails,
    };
  }

  /**
   * Create status history record within a transaction
   */
  private async createStatusHistoryRecordInTransaction(
    trx: DbTransaction,
    inventoryId: number,
    fromStatus: StatusType | null,
    toStatus: StatusType,
    changedBy: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    await trx.insert(inventoryStatusHistory).values({
      inventoryId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      notes,
    });
  }

  // Fixed transaction wrapper that passes trx to the operation
  private async withTransaction<T>(
    operation: (trx: DbTransaction) => Promise<T>
  ): Promise<T> {
    return await db.transaction(async (trx) => {
      try {
        return await operation(trx); // Pass transaction object to operation
      } catch (error) {
        // Drizzle automatically rolls back on any thrown error
        throw error;
      }
    });
  }
}
