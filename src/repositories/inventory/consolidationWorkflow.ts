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

  abstract getNextWorkingDay(
    currentDate: string,
    skipWeekends?: boolean
  ): string;

  abstract getCurrentDateInTimezone(): string;
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
    return await this.withTransaction(async (trx) => {
      // 1. Get current inventory and validate it can be consolidated
      const currentInventory = await trx.query.inventoryAssignments.findFirst({
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
      const nextDate = this.calculateNextInventoryDate(
        currentInventory.assignmentDate,
        skipWeekends
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
      const nextDayInventory =
        await this.createInventoryWithCarriedQuantitiesInTransaction(
          trx,
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

  /**
   * Smart date calculation for next inventory
   * If inventory date is more than 1 day old, use current date as base
   */
  private calculateNextInventoryDate(
    inventoryAssignmentDate: string,
    skipWeekends = false
  ): string {
    const currentDate = this.getCurrentDateInTimezone();
    const daysDifference = this.getDaysDifference(
      inventoryAssignmentDate,
      currentDate
    );

    // If more than 1 day difference, use current date as base
    // Otherwise use the inventory assignment date
    const baseDate = daysDifference > 1 ? currentDate : inventoryAssignmentDate;

    return this.getNextWorkingDay(baseDate, skipWeekends);
  }

  /**
   * Calculate difference in days between two date strings
   */
  private getDaysDifference(date1: string, date2: string): number {
    const [year1, month1, day1] = date1.split("-").map(Number);
    const [year2, month2, day2] = date2.split("-").map(Number);

    const d1 = new Date(year1, month1 - 1, day1);
    const d2 = new Date(year2, month2 - 1, day2);

    const timeDifference = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  }

  /**
   * Get current date in GMT-5 timezone formatted as YYYY-MM-DD
   */
  getCurrentDateInTimezone(): string {
    // Get current UTC time
    const now = new Date();

    // Convert to GMT-5 (subtract 5 hours from UTC)
    const gmt5Time = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    // Format as YYYY-MM-DD
    const year = gmt5Time.getUTCFullYear();
    const month = String(gmt5Time.getUTCMonth() + 1).padStart(2, "0");
    const day = String(gmt5Time.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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
        carriedQuantities
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
    }
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // Create base inventory assignment (repository should accept transaction)
    const baseAssignment =
      await this.inventoryAssignmentRepository.createWithTransaction(
        trx,
        assignmentId,
        assignmentDate,
        assignedBy,
        "Inventario creado automáticamente por consolidación del día anterior",
        true // autoAssignment = true
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

    // Return complete assignment
    return {
      ...baseAssignment,
      tanks: tankAssignments.map((ta, index) => ({
        ...ta,
        tankDetails: carriedQuantities.tanks[index],
      })),
      items: itemAssignments.map((ia, index) => ({
        ...ia,
        itemDetails: carriedQuantities.items[index],
      })),
    };
  }

  getNextWorkingDay(currentDate: string, skipWeekends = false): string {
    // Parse date string as local date in GMT-5 timezone
    // Split the date string to avoid timezone interpretation issues
    const [year, month, day] = currentDate.split("-").map(Number);

    // Create date in local timezone (GMT-5) - month is 0-indexed in JavaScript
    const current = new Date(year, month - 1, day);

    // Create next day
    let nextDay = new Date(current);
    nextDay.setDate(current.getDate() + 1);

    if (skipWeekends) {
      // Skip Saturday (6) and Sunday (0)
      // Now getDay() will correctly reflect the day in GMT-5 timezone
      while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
      }
    }

    // Format back to YYYY-MM-DD string
    // Using local date components to avoid timezone conversion
    const nextYear = nextDay.getFullYear();
    const nextMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
    const nextDayNum = String(nextDay.getDate()).padStart(2, "0");

    return `${nextYear}-${nextMonth}-${nextDayNum}`;
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
