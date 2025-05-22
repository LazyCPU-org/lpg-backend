// repositories/inventoryAssignmentRepository.ts

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  AssignmentStatusEnum,
  assignmentItems,
  assignmentTanks,
  inventoryAssignments,
  inventoryItem,
  tankType,
} from "../db/schemas/inventory";
import { storeAssignments } from "../db/schemas/locations";
import { users } from "../db/schemas/user-management/users";
import {
  AssignmentItemType,
  AssignmentTankType,
  InventoryAssignmentType,
  InventoryAssignmentWithDetails,
  NewAssignmentItemType,
  NewAssignmentTankType,
  NewInventoryAssignmentType,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../utils/custom-errors";

export interface InventoryAssignmentRepository {
  // Find methods
  find(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType
  ): Promise<InventoryAssignmentType[]>;

  findById(inventoryId: number): Promise<InventoryAssignmentWithDetails>;
  findByAssignmentId(assignmentId: number): Promise<InventoryAssignmentType>;

  // Create methods
  create(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string,
    autoAssignment?: boolean
  ): Promise<InventoryAssignmentType>;

  createTankAssignment(
    assignmentId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType>;

  createItemAssignment(
    assignmentId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType>;

  // Update methods
  updateStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType>;
}

export class PgInventoryAssignmentRepository
  implements InventoryAssignmentRepository
{
  async find(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType
  ): Promise<InventoryAssignmentType[]> {
    // If we need to filter by userId or storeId, we need to get the relevant assignmentIds first
    let relevantAssignmentIds: number[] | undefined = undefined;

    if (userId || storeId) {
      const assignments = await db.query.storeAssignments.findMany({
        where: and(
          userId ? eq(storeAssignments.userId, userId) : undefined,
          storeId ? eq(storeAssignments.storeId, storeId) : undefined
        ),
      });

      if (assignments.length === 0) {
        return []; // Early return if no matching store assignments
      }

      relevantAssignmentIds = assignments.map((a) => a.assignmentId);
    }

    // Build the where clause for the main query
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(inventoryAssignments.status, status));
    }

    if (date) {
      whereConditions.push(eq(inventoryAssignments.assignmentDate, date));
    }

    if (relevantAssignmentIds) {
      whereConditions.push(
        inArray(inventoryAssignments.assignmentId, relevantAssignmentIds)
      );
    }

    // Execute the query with all conditions
    if (whereConditions.length > 0) {
      return await db
        .select()
        .from(inventoryAssignments)
        .where(and(...whereConditions));
    } else {
      return await db.select().from(inventoryAssignments);
    }
  }

  async findById(inventoryId: number): Promise<InventoryAssignmentWithDetails> {
    // Get the base assignment
    const inventory = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, inventoryId),
    });

    if (!inventory) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    // Get all tank assignments with related tank types
    const tankAssignments = await db.query.assignmentTanks.findMany({
      where: eq(assignmentTanks.inventoryId, inventoryId),
      with: {
        tankType: true,
      },
    });

    // Get all item assignments with related inventory items
    const itemAssignments = await db.query.assignmentItems.findMany({
      where: eq(assignmentItems.inventoryId, inventoryId),
      with: {
        inventoryItem: true,
      },
    });

    // Return the assignment with all related data
    return {
      ...inventory,
      tanks: tankAssignments.map((ta) => ({
        ...ta,
        tankDetails: ta.tankType,
      })),
      items: itemAssignments.map((ia) => ({
        ...ia,
        itemDetails: ia.inventoryItem,
      })),
    };
  }

  async findByAssignmentId(
    assignmentId: number
  ): Promise<InventoryAssignmentType> {
    // Get the base assignment
    const assignment = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.assignmentId, assignmentId),
    });

    if (!assignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    return assignment;
  }

  async create(
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string,
    autoAssignment = false
  ): Promise<InventoryAssignmentType> {
    // Validate that the assignment and assignedBy user exist
    const storeAssignment = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.assignmentId, assignmentId),
    });

    if (!storeAssignment) {
      throw new NotFoundError("Asignación de tienda no encontrada");
    }

    const assigningUser = await db.query.users.findFirst({
      where: eq(users.userId, assignedBy),
    });

    if (!assigningUser) {
      throw new NotFoundError("Usuario asignador no encontrado");
    }

    // Create the inventory assignment
    const newAssignment: NewInventoryAssignmentType = {
      assignmentId,
      assignmentDate: assignmentDate,
      assignedBy,
      status: AssignmentStatusEnum.CREATED,
      autoAssignment,
      notes,
    };

    const results = await db
      .insert(inventoryAssignments)
      .values(newAssignment)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creando asignación de inventario");
    }

    return results[0];
  }

  async createTankAssignment(
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType> {
    // Validate that the assignment and tank type exist
    const inventoryAssignment = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, inventoryId),
    });

    if (!inventoryAssignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    const tank = await db.query.tankType.findFirst({
      where: eq(tankType.typeId, tankTypeId),
    });

    if (!tank) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }

    // Create the tank assignment
    const newTankAssignment: NewAssignmentTankType = {
      inventoryId,
      tankTypeId,
      purchase_price: purchase_price,
      sell_price,
      assignedFullTanks,
      currentFullTanks: assignedFullTanks, // Initially, current = assigned
      assignedEmptyTanks,
      currentEmptyTanks: assignedEmptyTanks,
    };

    const results = await db
      .insert(assignmentTanks)
      .values(newTankAssignment)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creando asignación de tanque");
    }

    return results[0];
  }

  async createItemAssignment(
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType> {
    // Validate that the assignment and item exist
    const assignment = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, inventoryId),
    });

    if (!assignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    const item = await db.query.inventoryItem.findFirst({
      where: eq(inventoryItem.inventoryItemId, inventoryItemId),
    });

    if (!item) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }

    // Create the item assignment
    const newItemAssignment: NewAssignmentItemType = {
      inventoryId,
      inventoryItemId,
      purchase_price,
      sell_price,
      assignedItems,
      currentItems: assignedItems, // Initially, current = assigned
    };

    const results = await db
      .insert(assignmentItems)
      .values(newItemAssignment)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creando asignación de artículo");
    }

    return results[0];
  }

  async updateStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType> {
    // First, get the current assignment to validate status transition
    const current = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, id),
    });

    if (!current) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    // Validate status transition
    const isValidTransition = this.validateStatusTransition(
      current.status,
      status
    );
    if (!isValidTransition) {
      throw new BadRequestError(
        `Transición de estado inválida de ${current.status} a ${status}`
      );
    }

    // Update the status
    const results = await db
      .update(inventoryAssignments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(inventoryAssignments.inventoryId, id))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error actualizando estado de asignación");
    }

    return results[0];
  }

  private validateStatusTransition(
    currentStatus: string | null,
    newStatus: string
  ): boolean {
    // Valid transitions:
    // CREATED -> ASSIGNED -> VALIDATED
    if (
      currentStatus === AssignmentStatusEnum.CREATED &&
      newStatus === AssignmentStatusEnum.ASSIGNED
    ) {
      return true;
    }
    if (
      currentStatus === AssignmentStatusEnum.ASSIGNED &&
      newStatus === AssignmentStatusEnum.VALIDATED
    ) {
      return true;
    }
    return false;
  }
}
