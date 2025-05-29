// src/repositories/inventory/consolidationWorkflow.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  assignmentItems,
  AssignmentStatusEnum,
  assignmentTanks,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import {
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
} from "../../dtos/response/inventoryAssignmentInterface";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";

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

  abstract getNextWorkingDay(
    currentDate: string,
    skipWeekends?: boolean
  ): string;
}

export class ConsolidationWorkflow implements IConsolidationWorkflow {
  constructor(
    private inventoryAssignmentRepository: any,
    private tankAssignmentRepository: any,
    private itemAssignmentRepository: any
  ) {}

  async consolidateAndCreateNext(
    inventoryId: number,
    userId: number,
    skipWeekends = false
  ): Promise<{
    currentInventory: InventoryAssignmentType;
    nextDayInventory: InventoryAssignmentWithDetailsAndRelations;
  }> {
    return await this.withTransaction(async () => {
      // 1. Get current inventory and validate it can be consolidated
      const currentInventory = await db.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
      });

      if (!currentInventory) {
        throw new NotFoundError("Asignación de inventario no encontrada");
      }

      // Validate current status allows consolidation
      if (currentInventory.status !== AssignmentStatusEnum.ASSIGNED) {
        throw new BadRequestError(
          `No se puede consolidar inventario con estado: ${currentInventory.status}. Debe estar en estado 'assigned'.`
        );
      }

      // 2. Get current final quantities (what we'll carry over)
      const [currentTanks, currentItems] = await Promise.all([
        db.query.assignmentTanks.findMany({
          where: eq(assignmentTanks.inventoryId, inventoryId),
          with: { tankType: true },
        }),
        db.query.assignmentItems.findMany({
          where: eq(assignmentItems.inventoryId, inventoryId),
          with: { inventoryItem: true },
        }),
      ]);

      // 3. Calculate next working day
      const nextDate = this.getNextWorkingDay(
        currentInventory.assignmentDate,
        skipWeekends
      );

      // 4. Check if next day inventory already exists (prevent duplicates)
      const existingNextDay = await db.query.inventoryAssignments.findFirst({
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
      const consolidatedInventory = await db
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

      // 6. Prepare carried quantities (current becomes assigned for next day)
      const carriedQuantities = {
        tanks: currentTanks.map((tank) => ({
          tankTypeId: tank.tankTypeId,
          fullTanks: tank.currentFullTanks,
          emptyTanks: tank.currentEmptyTanks,
          purchase_price: tank.purchase_price,
          sell_price: tank.sell_price,
        })),
        items: currentItems.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantity: item.currentItems,
          purchase_price: item.purchase_price,
          sell_price: item.sell_price,
        })),
      };

      // 7. Create next day inventory with carried quantities
      const nextDayInventory = await this.createInventoryWithCarriedQuantities(
        currentInventory.assignmentId,
        nextDate,
        userId,
        carriedQuantities
      );

      return {
        currentInventory: consolidatedInventory[0],
        nextDayInventory,
      };
    });
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
    // Create base inventory assignment
    const baseAssignment = await this.inventoryAssignmentRepository.create(
      assignmentId,
      assignmentDate,
      assignedBy,
      "Inventario creado automáticamente por consolidación del día anterior",
      true // autoAssignment = true
    );

    // Create tank assignments with carried quantities
    // Key insight: assignedFullTanks = currentFullTanks = carried quantity
    const tankPromises = carriedQuantities.tanks.map((tank) =>
      this.tankAssignmentRepository.create(
        baseAssignment.inventoryId,
        tank.tankTypeId,
        tank.purchase_price,
        tank.sell_price,
        tank.fullTanks, // assignedFullTanks = carried quantity
        tank.emptyTanks // assignedEmptyTanks = carried quantity
        // currentFullTanks/currentEmptyTanks will default to assigned quantities
      )
    );

    // Create item assignments with carried quantities
    // Key insight: assignedItems = currentItems = carried quantity
    const itemPromises = carriedQuantities.items.map((item) =>
      this.itemAssignmentRepository.create(
        baseAssignment.inventoryId,
        item.inventoryItemId,
        item.purchase_price,
        item.sell_price,
        item.quantity // assignedItems = carried quantity, currentItems will default to this
      )
    );

    // Execute all assignments
    const [tankAssignments, itemAssignments] = await Promise.all([
      Promise.all(tankPromises),
      Promise.all(itemPromises),
    ]);

    // Return complete assignment (no transaction records needed for carry-over)
    return {
      ...baseAssignment,
      tanks: tankAssignments.map((ta, index) => ({
        ...ta,
        tankDetails: carriedQuantities.tanks[index], // Add tank details if needed
      })),
      items: itemAssignments.map((ia, index) => ({
        ...ia,
        itemDetails: carriedQuantities.items[index], // Add item details if needed
      })),
    };
  }

  getNextWorkingDay(currentDate: string, skipWeekends = false): string {
    const current = new Date(currentDate);
    let nextDay = new Date(current);
    nextDay.setDate(current.getDate() + 1);

    if (skipWeekends) {
      // Skip Saturday (6) and Sunday (0)
      while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
      }
    }

    return nextDay.toISOString().split("T")[0];
  }

  // Database transaction wrapper with automatic rollback
  private async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return await db.transaction(async (trx) => {
      try {
        return await operation();
      } catch (error) {
        // Drizzle automatically rolls back on any thrown error
        // Re-throw to maintain error handling chain
        throw error;
      }
    });
  }
}
