import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  assignmentItems,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import inventoryItem from "../../db/schemas/inventory/inventory-item";
import {
  AssignmentItemType,
  NewAssignmentItemType,
} from "../../dtos/response/inventoryAssignmentInterface";
import { InternalError, NotFoundError } from "../../utils/custom-errors";
import { IItemAssignmentRepository } from "./IItemAssignmentRepository";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgItemAssignmentRepository implements IItemAssignmentRepository {
  async findByInventoryId(inventoryId: number): Promise<AssignmentItemType[]> {
    return await db.query.assignmentItems.findMany({
      where: eq(assignmentItems.inventoryId, inventoryId),
    });
  }

  async findByInventoryIdWithDetails(
    inventoryId: number
  ): Promise<(AssignmentItemType & { itemDetails: any })[]> {
    const itemAssignments = await db.query.assignmentItems.findMany({
      where: eq(assignmentItems.inventoryId, inventoryId),
      with: {
        inventoryItem: true,
      },
    });

    return itemAssignments.map((ia) => ({
      ...ia,
      itemDetails: ia.inventoryItem,
    }));
  }

  async create(
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

  async createWithTransaction(
    trx: DbTransaction,
    inventoryId: number,
    inventoryItemId: number,
    purchase_price: string,
    sell_price: string,
    assignedItems: number
  ): Promise<AssignmentItemType> {
    // Validate that the assignment and item exist using transaction
    const assignment = await trx.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.inventoryId, inventoryId),
    });

    if (!assignment) {
      throw new NotFoundError("Asignación de inventario no encontrada");
    }

    const item = await trx.query.inventoryItem.findFirst({
      where: eq(inventoryItem.inventoryItemId, inventoryItemId),
    });

    if (!item) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }

    const newItemAssignment: NewAssignmentItemType = {
      inventoryId,
      inventoryItemId,
      purchase_price,
      sell_price,
      assignedItems,
      currentItems: assignedItems, // Initially, current = assigned
    };

    const results = await trx
      .insert(assignmentItems)
      .values(newItemAssignment)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creando asignación de artículo");
    }

    return results[0];
  }

  async createOrFind(
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

    if (existingAssignment) {
      return existingAssignment;
    }

    // If no existing assignment, create a new one
    return await this.create(
      inventoryId,
      inventoryItemId,
      purchase_price,
      sell_price,
      assignedItems
    );
  }

  async update(
    inventoryId: number,
    inventoryItemId: number,
    data: {
      purchase_price?: string;
      sell_price?: string;
      assignedItems?: number;
      currentItems?: number;
    }
  ): Promise<AssignmentItemType> {
    // Find existing assignment
    const existing = await db.query.assignmentItems.findFirst({
      where: and(
        eq(assignmentItems.inventoryId, inventoryId),
        eq(assignmentItems.inventoryItemId, inventoryItemId)
      ),
    });

    if (!existing) {
      throw new NotFoundError("Asignación de artículo no encontrada");
    }

    const results = await db
      .update(assignmentItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assignmentItems.inventoryId, inventoryId),
          eq(assignmentItems.inventoryItemId, inventoryItemId)
        )
      )
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error actualizando asignación de artículo");
    }

    return results[0];
  }

  async updateBatch(
    inventoryId: number,
    items: {
      inventoryItemId: number;
      purchase_price: string;
      sell_price: string;
      assignedItems: number;
    }[]
  ): Promise<AssignmentItemType[]> {
    const updatedItems: AssignmentItemType[] = [];

    for (const item of items) {
      try {
        const updated = await this.update(inventoryId, item.inventoryItemId, {
          purchase_price: item.purchase_price,
          sell_price: item.sell_price,
          assignedItems: item.assignedItems,
        });
        updatedItems.push(updated);
      } catch (error) {
        // If item assignment doesn't exist, create it
        if (error instanceof NotFoundError) {
          const created = await this.create(
            inventoryId,
            item.inventoryItemId,
            item.purchase_price,
            item.sell_price,
            item.assignedItems
          );
          updatedItems.push(created);
        } else {
          throw error;
        }
      }
    }

    return updatedItems;
  }

  async delete(inventoryId: number, inventoryItemId: number): Promise<boolean> {
    const results = await db
      .delete(assignmentItems)
      .where(
        and(
          eq(assignmentItems.inventoryId, inventoryId),
          eq(assignmentItems.inventoryItemId, inventoryItemId)
        )
      )
      .returning();

    return results.length > 0;
  }
}
