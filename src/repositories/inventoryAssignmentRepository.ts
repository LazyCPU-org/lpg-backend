import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  assignmentItems,
  AssignmentStatusEnum,
  assignmentTanks,
  inventoryAssignments,
  inventoryItem,
  tankType,
} from "../db/schemas/inventory";
import { storeAssignments } from "../db/schemas/locations";
import { users } from "../db/schemas/user-management";
import {
  AssignmentItemType,
  AssignmentTankType,
  InventoryAssignmentBasic,
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetails,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  InventoryAssignmentWithStore,
  InventoryAssignmentWithUser,
  InventoryAssignmentWithUserAndStore,
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
    status?: StatusType,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithRelations[]>;

  findById(inventoryId: number): Promise<InventoryAssignmentWithDetails>;

  // New method to support relations
  findByIdWithRelations(
    inventoryId: number,
    relations?: InventoryAssignmentRelationOptions
  ): Promise<InventoryAssignmentWithDetailsAndRelations>;

  findByAssignmentId(
    assignmentId: number
  ): Promise<InventoryAssignmentType | undefined>;

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

  createOrFindTankAssignment(
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType>;

  createOrFindItemAssignment(
    inventoryId: number,
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
  // Helper method to build relation query options (refactored from find method)
  private buildRelationQueryOptions(
    relations: InventoryAssignmentRelationOptions
  ) {
    let queryWith: any = {};

    // Always include storeAssignment if we need user or store relations
    if (relations.user || relations.store) {
      queryWith.storeAssignment = {
        with: {},
      };

      // Add user relation if requested
      if (relations.user) {
        queryWith.storeAssignment.with.user = {
          columns: {
            userId: true,
            name: true,
          },
          with: {
            userProfile: {
              columns: {
                firstName: true,
                lastName: true,
                entryDate: true,
              },
            },
          },
        };
      }

      // Add store relation if requested
      if (relations.store) {
        queryWith.storeAssignment.with.store = {
          columns: {
            storeId: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phoneNumber: true,
            mapsUrl: true,
          },
        };
      }
    }

    return queryWith;
  }

  async find(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithRelations[]> {
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

    // If no relations are requested, return basic inventory assignments
    if (!relations.user && !relations.store) {
      const basicAssignments: InventoryAssignmentBasic[] =
        whereConditions.length > 0
          ? await db
              .select()
              .from(inventoryAssignments)
              .where(and(...whereConditions))
          : await db.select().from(inventoryAssignments);

      return basicAssignments;
    }

    // Build the query with relations using the refactored helper
    const queryWith = this.buildRelationQueryOptions(relations);

    // Execute the query with relations
    const queryOptions: any = {
      with: queryWith,
    };

    if (whereConditions.length > 0) {
      queryOptions.where = and(...whereConditions);
    }

    const assignmentsWithRelations =
      await db.query.inventoryAssignments.findMany(queryOptions);

    // Type the response based on the relations requested
    if (relations.user && relations.store) {
      return assignmentsWithRelations as InventoryAssignmentWithUserAndStore[];
    } else if (relations.user) {
      return assignmentsWithRelations as InventoryAssignmentWithUser[];
    } else if (relations.store) {
      return assignmentsWithRelations as InventoryAssignmentWithStore[];
    }

    // This shouldn't happen given our logic above, but for type safety
    return assignmentsWithRelations as InventoryAssignmentBasic[];
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

  // New method that supports both tank/item details AND user/store relations
  async findByIdWithRelations(
    inventoryId: number,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // First get the base assignment with user/store relations if requested
    let baseAssignment: any;

    if (relations.user || relations.store) {
      // Build query with relations using the refactored helper
      const queryWith = this.buildRelationQueryOptions(relations);

      baseAssignment = await db.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
        with: queryWith,
      });
    } else {
      // Simple query without relations
      baseAssignment = await db.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
      });
    }

    if (!baseAssignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    // Always get tank and item details (maintaining current behavior)
    const tankAssignments = await db.query.assignmentTanks.findMany({
      where: eq(assignmentTanks.inventoryId, inventoryId),
      with: {
        tankType: true,
      },
    });

    const itemAssignments = await db.query.assignmentItems.findMany({
      where: eq(assignmentItems.inventoryId, inventoryId),
      with: {
        inventoryItem: true,
      },
    });

    // Build the result with tank/item details and optional user/store relations
    const result: InventoryAssignmentWithDetailsAndRelations = {
      ...baseAssignment,
      tanks: tankAssignments.map((ta) => ({
        ...ta,
        tankDetails: ta.tankType,
      })),
      items: itemAssignments.map((ia) => ({
        ...ia,
        itemDetails: ia.inventoryItem,
      })),
    };

    return result;
  }

  async findByAssignmentId(
    assignmentId: number
  ): Promise<InventoryAssignmentType | undefined> {
    // Get the base assignment
    const assignment = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.assignmentId, assignmentId),
    });

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

  async createOrFindTankAssignment(
    inventoryId: number,
    tankTypeId: number,
    purchase_price: string,
    sell_price: string,
    assignedFullTanks: number,
    assignedEmptyTanks: number
  ): Promise<AssignmentTankType> {
    // First, try to find an existing assignment
    const existingAssignment = await db.query.assignmentTanks.findFirst({
      where: and(
        eq(assignmentTanks.inventoryId, inventoryId),
        eq(assignmentTanks.tankTypeId, tankTypeId)
      ),
    });

    if (existingAssignment) return existingAssignment;

    // If no existing assignment, create a new one
    return await this.createTankAssignment(
      inventoryId,
      tankTypeId,
      purchase_price,
      sell_price,
      assignedFullTanks,
      assignedEmptyTanks
    );
  }

  async createOrFindItemAssignment(
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType> {
    // First, try to find an existing assignment
    const existingAssignment = await db.query.assignmentItems.findFirst({
      where: and(
        eq(assignmentItems.inventoryId, inventoryId),
        eq(assignmentItems.inventoryItemId, inventoryItemId)
      ),
    });

    if (existingAssignment) return existingAssignment;

    // If no existing assignment, create a new one
    return await this.createItemAssignment(
      inventoryId,
      inventoryItemId,
      purchase_price,
      sell_price,
      assignedItems
    );
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
