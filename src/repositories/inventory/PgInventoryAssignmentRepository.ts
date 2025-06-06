import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  AssignmentStatusEnum,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import { storeAssignments } from "../../db/schemas/locations";
import { users } from "../../db/schemas/user-management";
import {
  InventoryAssignmentBasic,
  InventoryAssignmentRelationOptions,
  InventoryAssignmentType,
  InventoryAssignmentWithDetailsAndRelations,
  InventoryAssignmentWithRelations,
  InventoryAssignmentWithStore,
  InventoryAssignmentWithUser,
  InventoryAssignmentWithUserAndStore,
  NewInventoryAssignmentType,
  StatusType,
} from "../../dtos/response/inventoryAssignmentInterface";
import { InventoryAssignmentQueryBuilder } from "../../helpers/InventoryAssignmentQueryBuilder";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import { IInventoryAssignmentRepository } from "./IInventoryAssignmentRepository";
import { IItemAssignmentRepository } from "./IItemAssignmentRepository";
import { ITankAssignmentRepository } from "./ITankAssignmentRepository";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgInventoryAssignmentRepository
  implements IInventoryAssignmentRepository
{
  constructor(
    private tankAssignmentRepo: ITankAssignmentRepository,
    private itemAssignmentRepo: IItemAssignmentRepository
  ) {}

  async find(
    userId?: number,
    storeId?: number,
    date?: string,
    status?: StatusType,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithRelations[]> {
    // Get relevant assignment IDs if filtering by user/store
    const relevantAssignmentIds =
      await InventoryAssignmentQueryBuilder.getRelevantAssignmentIds(
        userId,
        storeId
      );

    // Early return if no matching assignments found
    if (relevantAssignmentIds && relevantAssignmentIds.length === 0) {
      return [];
    }

    // Build where conditions
    const whereConditions =
      InventoryAssignmentQueryBuilder.buildWhereConditions(
        status,
        date,
        relevantAssignmentIds
      );

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

    // Build query with relations
    const queryWith =
      InventoryAssignmentQueryBuilder.buildRelationQueryOptions(relations);

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

    return assignmentsWithRelations as InventoryAssignmentBasic[];
  }

  async findById(inventoryId: number): Promise<InventoryAssignmentType | null> {
    const inventory = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, inventoryId),
    });

    return inventory || null;
  }

  async findByIdWithRelations(
    inventoryId: number,
    relations: InventoryAssignmentRelationOptions = {}
  ): Promise<InventoryAssignmentWithDetailsAndRelations> {
    // Get base assignment with user/store relations if requested
    let baseAssignment: any;

    if (relations.user || relations.store) {
      const queryWith =
        InventoryAssignmentQueryBuilder.buildRelationQueryOptions(relations);

      baseAssignment = await db.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
        with: queryWith,
      });
    } else {
      baseAssignment = await db.query.inventoryAssignments.findFirst({
        where: eq(inventoryAssignments.inventoryId, inventoryId),
      });
    }

    if (!baseAssignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    // Get tank and item details using the dedicated repositories
    const [tankAssignments, itemAssignments] = await Promise.all([
      this.tankAssignmentRepo.findByInventoryIdWithDetails(inventoryId),
      this.itemAssignmentRepo.findByInventoryIdWithDetails(inventoryId),
    ]);

    return {
      ...baseAssignment,
      tanks: tankAssignments,
      items: itemAssignments,
    };
  }

  async findByAssignmentId(
    assignmentId: number
  ): Promise<InventoryAssignmentType | null> {
    const assignment = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.assignmentId, assignmentId),
    });

    return assignment || null;
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

  async createWithTransaction(
    trx: DbTransaction,
    assignmentId: number,
    assignmentDate: string,
    assignedBy: number,
    notes?: string,
    autoAssignment = false
  ): Promise<InventoryAssignmentType> {
    // Validate that the assignment and assignedBy user exist using transaction
    const storeAssignment = await trx.query.storeAssignments.findFirst({
      where: eq(storeAssignments.assignmentId, assignmentId),
    });

    if (!storeAssignment) {
      throw new NotFoundError("Asignación de tienda no encontrada");
    }

    const assigningUser = await trx.query.users.findFirst({
      where: eq(users.userId, assignedBy),
    });

    if (!assigningUser) {
      throw new NotFoundError("Usuario asignador no encontrado");
    }

    const newAssignment: NewInventoryAssignmentType = {
      assignmentId,
      assignmentDate: assignmentDate,
      assignedBy,
      status: AssignmentStatusEnum.CREATED,
      autoAssignment,
      notes,
    };

    const results = await trx
      .insert(inventoryAssignments)
      .values(newAssignment)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creando asignación de inventario");
    }

    return results[0];
  }

  async updateStatus(
    id: number,
    status: StatusType
  ): Promise<InventoryAssignmentType> {
    const current = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, id),
    });

    if (!current) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    const isValidTransition = this.validateStatusTransition(
      current.status,
      status
    );
    if (!isValidTransition) {
      throw new BadRequestError(
        `Transición de estado inválida de ${current.status} a ${status}`
      );
    }

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

  validateStatusTransition(
    currentStatus: string | null,
    newStatus: string
  ): boolean {
    // Updated status transitions: CREATED → ASSIGNED → CONSOLIDATED → VALIDATED/OBSERVED
    const validTransitions = [
      // Basic workflow
      [AssignmentStatusEnum.CREATED, AssignmentStatusEnum.ASSIGNED],
      [AssignmentStatusEnum.ASSIGNED, AssignmentStatusEnum.CONSOLIDATED],

      // Operator validation
      [AssignmentStatusEnum.CONSOLIDATED, AssignmentStatusEnum.VALIDATED],
      [AssignmentStatusEnum.CONSOLIDATED, AssignmentStatusEnum.OBSERVED],

      // Re-validation after observation
      [AssignmentStatusEnum.OBSERVED, AssignmentStatusEnum.VALIDATED],
      [AssignmentStatusEnum.OBSERVED, AssignmentStatusEnum.CONSOLIDATED], // To fix issues and reconsolidate

      // Admin overrides (can move backwards for corrections)
      [AssignmentStatusEnum.CONSOLIDATED, AssignmentStatusEnum.ASSIGNED], // Reopen for corrections
      [AssignmentStatusEnum.VALIDATED, AssignmentStatusEnum.OBSERVED], // Admin found issues
    ];

    return validTransitions.some(
      ([from, to]) => currentStatus === from && newStatus === to
    );
  }

  // New method: Check if next day inventory already exists
  async checkNextDayExists(
    assignmentId: number,
    currentDate: string
  ): Promise<boolean> {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDateStr = nextDay.toISOString().split("T")[0];

    const existing = await db.query.inventoryAssignments.findFirst({
      where: and(
        eq(inventoryAssignments.assignmentId, assignmentId),
        eq(inventoryAssignments.assignmentDate, nextDateStr)
      ),
    });

    return !!existing;
  }

  // New method: Find existing inventory for specific date
  async findByAssignmentAndDate(
    assignmentId: number,
    date: string
  ): Promise<InventoryAssignmentType | null> {
    const assignment = await db.query.inventoryAssignments.findFirst({
      where: and(
        eq(inventoryAssignments.assignmentId, assignmentId),
        eq(inventoryAssignments.assignmentDate, date)
      ),
    });

    return assignment || null;
  }
}
