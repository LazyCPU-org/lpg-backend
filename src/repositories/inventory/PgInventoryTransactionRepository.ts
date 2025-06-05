// src/repositories/inventory/PgTransactionService.ts - Updated to match existing schema
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  assignmentItems,
  assignmentTanks,
  itemTransactions,
  tankTransactions,
} from "../../db/schemas/inventory";
import { InternalError, NotFoundError } from "../../utils/custom-errors";
import { IInventoryTransactionRepository } from "./IInventoryTransactionRepository";
import { TransactionType } from "./transactionTypes";

export class PgInventoryTransactionRepository
  implements IInventoryTransactionRepository
{
  // Direct assignment-based methods (matches your schema exactly)
  async incrementTankQuantity(
    assignmentTankId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void> {
    await db.transaction(async (trx) => {
      // Get current assignment
      const assignment = await trx.query.assignmentTanks.findFirst({
        where: eq(assignmentTanks.inventoryAssignmentTankId, assignmentTankId),
      });

      if (!assignment) {
        throw new NotFoundError("Asignación de tanque no encontrada");
      }

      // Create transaction record using your existing schema
      await trx.insert(tankTransactions).values({
        assignmentTankId,
        transactionType,
        fullTanksChange,
        emptyTanksChange,
        userId,
        transactionDate: new Date(),
        referenceId,
        notes,
      });

      // Update current quantities in assignment table
      await trx
        .update(assignmentTanks)
        .set({
          currentFullTanks: assignment.currentFullTanks + fullTanksChange,
          currentEmptyTanks: assignment.currentEmptyTanks + emptyTanksChange,
          updatedAt: new Date(),
        })
        .where(eq(assignmentTanks.inventoryAssignmentTankId, assignmentTankId));
    });
  }

  async decrementTankQuantity(
    assignmentTankId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void> {
    await db.transaction(async (trx) => {
      // Get current assignment
      const assignment = await trx.query.assignmentTanks.findFirst({
        where: eq(assignmentTanks.inventoryAssignmentTankId, assignmentTankId),
      });

      if (!assignment) {
        throw new NotFoundError("Asignación de tanque no encontrada");
      }

      // Validate sufficient quantity
      if (
        assignment.currentFullTanks < fullTanksChange ||
        assignment.currentEmptyTanks < emptyTanksChange
      ) {
        throw new InternalError(
          "Cantidad insuficiente de tanques para la transacción"
        );
      }

      // Create transaction record with negative values
      await trx.insert(tankTransactions).values({
        assignmentTankId,
        transactionType,
        fullTanksChange: -fullTanksChange,
        emptyTanksChange: -emptyTanksChange,
        userId,
        transactionDate: new Date(),
        referenceId,
        notes,
      });

      // Update current quantities
      await trx
        .update(assignmentTanks)
        .set({
          currentFullTanks: assignment.currentFullTanks - fullTanksChange,
          currentEmptyTanks: assignment.currentEmptyTanks - emptyTanksChange,
          updatedAt: new Date(),
        })
        .where(eq(assignmentTanks.inventoryAssignmentTankId, assignmentTankId));
    });
  }

  async incrementItemQuantity(
    assignmentItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void> {
    await db.transaction(async (trx) => {
      // Get current assignment
      const assignment = await trx.query.assignmentItems.findFirst({
        where: eq(assignmentItems.inventoryAssignmentItemId, assignmentItemId),
      });

      if (!assignment) {
        throw new NotFoundError("Asignación de artículo no encontrada");
      }

      // Create transaction record using your existing schema
      await trx.insert(itemTransactions).values({
        assignmentItemId,
        transactionType,
        itemChange,
        userId,
        transactionDate: new Date(),
        notes,
      });

      // Update current quantity
      await trx
        .update(assignmentItems)
        .set({
          currentItems: assignment.currentItems + itemChange,
          updatedAt: new Date(),
        })
        .where(eq(assignmentItems.inventoryAssignmentItemId, assignmentItemId));
    });
  }

  async decrementItemQuantity(
    assignmentItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void> {
    await db.transaction(async (trx) => {
      // Get current assignment
      const assignment = await trx.query.assignmentItems.findFirst({
        where: eq(assignmentItems.inventoryAssignmentItemId, assignmentItemId),
      });

      if (!assignment) {
        throw new NotFoundError("Asignación de artículo no encontrada");
      }

      // Validate sufficient quantity
      if (assignment.currentItems < itemChange) {
        throw new InternalError(
          "Cantidad insuficiente de artículos para la transacción"
        );
      }

      // Create transaction record with negative value
      await trx.insert(itemTransactions).values({
        assignmentItemId,
        transactionType,
        itemChange: -itemChange,
        userId,
        transactionDate: new Date(),
        notes,
      });

      // Update current quantity
      await trx
        .update(assignmentItems)
        .set({
          currentItems: assignment.currentItems - itemChange,
          updatedAt: new Date(),
        })
        .where(eq(assignmentItems.inventoryAssignmentItemId, assignmentItemId));
    });
  }

  // Convenience methods that work with inventoryId (find assignments first)
  async incrementTankByInventoryId(
    inventoryId: number,
    tankTypeId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void> {
    const assignment = await db.query.assignmentTanks.findFirst({
      where: and(
        eq(assignmentTanks.inventoryId, inventoryId),
        eq(assignmentTanks.tankTypeId, tankTypeId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError(
        "Asignación de tanque no encontrada para este inventario"
      );
    }

    await this.incrementTankQuantity(
      assignment.inventoryAssignmentTankId,
      fullTanksChange,
      emptyTanksChange,
      transactionType,
      userId,
      notes,
      referenceId
    );
  }

  async decrementTankByInventoryId(
    inventoryId: number,
    tankTypeId: number,
    fullTanksChange: number,
    emptyTanksChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string,
    referenceId?: number
  ): Promise<void> {
    const assignment = await db.query.assignmentTanks.findFirst({
      where: and(
        eq(assignmentTanks.inventoryId, inventoryId),
        eq(assignmentTanks.tankTypeId, tankTypeId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError(
        "Asignación de tanque no encontrada para este inventario"
      );
    }

    await this.decrementTankQuantity(
      assignment.inventoryAssignmentTankId,
      fullTanksChange,
      emptyTanksChange,
      transactionType,
      userId,
      notes,
      referenceId
    );
  }

  async incrementItemByInventoryId(
    inventoryId: number,
    inventoryItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void> {
    const assignment = await db.query.assignmentItems.findFirst({
      where: and(
        eq(assignmentItems.inventoryId, inventoryId),
        eq(assignmentItems.inventoryItemId, inventoryItemId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError(
        "Asignación de artículo no encontrada para este inventario"
      );
    }

    await this.incrementItemQuantity(
      assignment.inventoryAssignmentItemId,
      itemChange,
      transactionType,
      userId,
      notes
    );
  }

  async decrementItemByInventoryId(
    inventoryId: number,
    inventoryItemId: number,
    itemChange: number,
    transactionType: TransactionType,
    userId: number,
    notes?: string
  ): Promise<void> {
    const assignment = await db.query.assignmentItems.findFirst({
      where: and(
        eq(assignmentItems.inventoryId, inventoryId),
        eq(assignmentItems.inventoryItemId, inventoryItemId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError(
        "Asignación de artículo no encontrada para este inventario"
      );
    }

    await this.decrementItemQuantity(
      assignment.inventoryAssignmentItemId,
      itemChange,
      transactionType,
      userId,
      notes
    );
  }

  async processTankTransactions(
    inventoryId: number,
    transactions: {
      tankTypeId: number;
      fullTanksChange: number;
      emptyTanksChange: number;
      transactionType: TransactionType;
      userId: number;
      notes?: string;
      referenceId?: number;
    }[],
    useDbTransaction = true
  ): Promise<void> {
    if (useDbTransaction) {
      await db.transaction(async (trx) => {
        for (const transaction of transactions) {
          if (
            transaction.fullTanksChange >= 0 &&
            transaction.emptyTanksChange >= 0
          ) {
            await this.incrementTankByInventoryId(
              inventoryId,
              transaction.tankTypeId,
              transaction.fullTanksChange,
              transaction.emptyTanksChange,
              transaction.transactionType,
              transaction.userId,
              transaction.notes,
              transaction.referenceId
            );
          } else {
            await this.decrementTankByInventoryId(
              inventoryId,
              transaction.tankTypeId,
              Math.abs(transaction.fullTanksChange),
              Math.abs(transaction.emptyTanksChange),
              transaction.transactionType,
              transaction.userId,
              transaction.notes,
              transaction.referenceId
            );
          }
        }
      });
    } else {
      for (const transaction of transactions) {
        if (
          transaction.fullTanksChange >= 0 &&
          transaction.emptyTanksChange >= 0
        ) {
          await this.incrementTankByInventoryId(
            inventoryId,
            transaction.tankTypeId,
            transaction.fullTanksChange,
            transaction.emptyTanksChange,
            transaction.transactionType,
            transaction.userId,
            transaction.notes,
            transaction.referenceId
          );
        } else {
          await this.decrementTankByInventoryId(
            inventoryId,
            transaction.tankTypeId,
            Math.abs(transaction.fullTanksChange),
            Math.abs(transaction.emptyTanksChange),
            transaction.transactionType,
            transaction.userId,
            transaction.notes,
            transaction.referenceId
          );
        }
      }
    }
  }

  async processItemTransactions(
    inventoryId: number,
    transactions: {
      inventoryItemId: number;
      itemChange: number;
      transactionType: TransactionType;
      userId: number;
      notes?: string;
    }[],
    useDbTransaction = true
  ): Promise<void> {
    if (useDbTransaction) {
      await db.transaction(async (trx) => {
        for (const transaction of transactions) {
          if (transaction.itemChange >= 0) {
            await this.incrementItemByInventoryId(
              inventoryId,
              transaction.inventoryItemId,
              transaction.itemChange,
              transaction.transactionType,
              transaction.userId,
              transaction.notes
            );
          } else {
            await this.decrementItemByInventoryId(
              inventoryId,
              transaction.inventoryItemId,
              Math.abs(transaction.itemChange),
              transaction.transactionType,
              transaction.userId,
              transaction.notes
            );
          }
        }
      });
    } else {
      for (const transaction of transactions) {
        if (transaction.itemChange >= 0) {
          await this.incrementItemByInventoryId(
            inventoryId,
            transaction.inventoryItemId,
            transaction.itemChange,
            transaction.transactionType,
            transaction.userId,
            transaction.notes
          );
        } else {
          await this.decrementItemByInventoryId(
            inventoryId,
            transaction.inventoryItemId,
            Math.abs(transaction.itemChange),
            transaction.transactionType,
            transaction.userId,
            transaction.notes
          );
        }
      }
    }
  }

  async getCurrentTankQuantities(
    inventoryId: number,
    tankTypeId: number
  ): Promise<{
    currentFullTanks: number;
    currentEmptyTanks: number;
  }> {
    const assignment = await db.query.assignmentTanks.findFirst({
      where: and(
        eq(assignmentTanks.inventoryId, inventoryId),
        eq(assignmentTanks.tankTypeId, tankTypeId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError("Asignación de tanque no encontrada");
    }

    return {
      currentFullTanks: assignment.currentFullTanks,
      currentEmptyTanks: assignment.currentEmptyTanks,
    };
  }

  async getCurrentItemQuantity(
    inventoryId: number,
    inventoryItemId: number
  ): Promise<{
    currentItems: number;
  }> {
    const assignment = await db.query.assignmentItems.findFirst({
      where: and(
        eq(assignmentItems.inventoryId, inventoryId),
        eq(assignmentItems.inventoryItemId, inventoryItemId)
      ),
    });

    if (!assignment) {
      throw new NotFoundError("Asignación de artículo no encontrada");
    }

    return {
      currentItems: assignment.currentItems,
    };
  }
}
