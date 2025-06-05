import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  assignmentTanks,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import tankType from "../../db/schemas/inventory/tank-type";
import {
  AssignmentTankType,
  AssignmentTankWithDetails,
  NewAssignmentTankType,
} from "../../dtos/response/inventoryAssignmentInterface";
import { TankType } from "../../dtos/response/inventoryInterface";
import { InternalError, NotFoundError } from "../../utils/custom-errors";
import { ITankAssignmentRepository } from "./ITankAssignmentRepository";

export class PgTankAssignmentRepository implements ITankAssignmentRepository {
  async findByInventoryId(inventoryId: number): Promise<AssignmentTankType[]> {
    return await db.query.assignmentTanks.findMany({
      where: eq(assignmentTanks.inventoryId, inventoryId),
    });
  }

  async findByInventoryIdWithDetails(
    inventoryId: number
  ): Promise<AssignmentTankWithDetails[]> {
    const tankAssignments = await db.query.assignmentTanks.findMany({
      where: eq(assignmentTanks.inventoryId, inventoryId),
      with: {
        tankType: true,
      },
    });

    return tankAssignments.map((ta) => {
      const { tankType: tankTypeData, ...assignmentData } = ta;

      // Create the AssignmentTankWithDetails object
      const tankWithDetails: AssignmentTankWithDetails = {
        ...assignmentData,
        tankDetails: tankTypeData as TankType,
      };

      return tankWithDetails;
    });
  }

  async create(
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

  async createOrFind(
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

    if (existingAssignment) {
      return existingAssignment;
    }

    // If no existing assignment, create a new one
    return await this.create(
      inventoryId,
      tankTypeId,
      purchase_price,
      sell_price,
      assignedFullTanks,
      assignedEmptyTanks
    );
  }

  async update(
    inventoryId: number,
    tankTypeId: number,
    data: {
      purchase_price?: string;
      sell_price?: string;
      assignedFullTanks?: number;
      assignedEmptyTanks?: number;
      currentFullTanks?: number;
      currentEmptyTanks?: number;
    }
  ): Promise<AssignmentTankType> {
    // Find existing assignment
    const existing = await db.query.assignmentTanks.findFirst({
      where: and(
        eq(assignmentTanks.inventoryId, inventoryId),
        eq(assignmentTanks.tankTypeId, tankTypeId)
      ),
    });

    if (!existing) {
      throw new NotFoundError("Asignación de tanque no encontrada");
    }

    const results = await db
      .update(assignmentTanks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assignmentTanks.inventoryId, inventoryId),
          eq(assignmentTanks.tankTypeId, tankTypeId)
        )
      )
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error actualizando asignación de tanque");
    }

    return results[0];
  }

  async updateBatch(
    inventoryId: number,
    tanks: {
      tankTypeId: number;
      purchase_price: string;
      sell_price: string;
      assignedFullTanks: number;
      assignedEmptyTanks: number;
    }[]
  ): Promise<AssignmentTankType[]> {
    const updatedTanks: AssignmentTankType[] = [];

    for (const tank of tanks) {
      try {
        const updated = await this.update(inventoryId, tank.tankTypeId, {
          purchase_price: tank.purchase_price,
          sell_price: tank.sell_price,
          assignedFullTanks: tank.assignedFullTanks,
          assignedEmptyTanks: tank.assignedEmptyTanks,
        });
        updatedTanks.push(updated);
      } catch (error) {
        // If tank assignment doesn't exist, create it
        if (error instanceof NotFoundError) {
          const created = await this.create(
            inventoryId,
            tank.tankTypeId,
            tank.purchase_price,
            tank.sell_price,
            tank.assignedFullTanks,
            tank.assignedEmptyTanks
          );
          updatedTanks.push(created);
        } else {
          throw error;
        }
      }
    }

    return updatedTanks;
  }

  async delete(inventoryId: number, tankTypeId: number): Promise<boolean> {
    const results = await db
      .delete(assignmentTanks)
      .where(
        and(
          eq(assignmentTanks.inventoryId, inventoryId),
          eq(assignmentTanks.tankTypeId, tankTypeId)
        )
      )
      .returning();

    return results.length > 0;
  }
}
