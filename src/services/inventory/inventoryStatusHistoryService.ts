// src/services/inventoryStatusHistoryService.ts
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db";
import { inventoryStatusHistory } from "../../db/schemas/audit/inventory-status-history";
import { StatusType } from "../../dtos/response/inventoryAssignmentInterface";

export interface StatusHistoryEntry {
  historyId: number;
  inventoryId: number;
  fromStatus: StatusType | null;
  toStatus: StatusType;
  changedBy: number;
  changedAt: Date;
  reason: string | null;
  notes: string | null;
  // Related data
  changedByUser?: {
    userId: number;
    email: string;
    userProfile: {
      firstName: string;
      lastName: string;
    };
  };
  inventoryAssignment?: {
    inventoryId: number;
    assignmentDate: string;
    assignmentId: number;
  };
}

export interface IInventoryStatusHistoryService {
  getHistoryByInventoryId(
    inventoryId: number,
    includeRelations?: boolean
  ): Promise<StatusHistoryEntry[]>;

  getHistoryByDateRange(
    startDate: string,
    endDate: string,
    includeRelations?: boolean
  ): Promise<StatusHistoryEntry[]>;

  getHistoryByUser(
    userId: number,
    includeRelations?: boolean
  ): Promise<StatusHistoryEntry[]>;

  getStaleInventoryConsolidations(
    daysThreshold?: number
  ): Promise<StatusHistoryEntry[]>;

  getAuditReport(
    startDate: string,
    endDate: string
  ): Promise<{
    totalChanges: number;
    changesByStatus: Record<string, number>;
    automatedChanges: number;
    manualChanges: number;
    staleRecoveries: number;
  }>;
}

export class InventoryStatusHistoryService
  implements IInventoryStatusHistoryService
{
  async getHistoryByInventoryId(
    inventoryId: number,
    includeRelations = false
  ): Promise<StatusHistoryEntry[]> {
    const query = db.query.inventoryStatusHistory.findMany({
      where: eq(inventoryStatusHistory.inventoryId, inventoryId),
      orderBy: desc(inventoryStatusHistory.changedAt),
      with: includeRelations
        ? {
            changedByUser: {
              columns: {
                userId: true,
                email: true,
              },
              with: {
                userProfile: {
                  columns: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            inventoryAssignment: {
              columns: {
                inventoryId: true,
                assignmentDate: true,
                assignmentId: true,
              },
            },
          }
        : undefined,
    });

    return await query;
  }

  async getHistoryByDateRange(
    startDate: string,
    endDate: string,
    includeRelations = false
  ): Promise<StatusHistoryEntry[]> {
    const query = db.query.inventoryStatusHistory.findMany({
      where: and(
        gte(inventoryStatusHistory.changedAt, new Date(startDate)),
        lte(inventoryStatusHistory.changedAt, new Date(endDate + "T23:59:59"))
      ),
      orderBy: desc(inventoryStatusHistory.changedAt),
      with: includeRelations
        ? {
            changedByUser: {
              columns: {
                userId: true,
                email: true,
              },
              with: {
                userProfile: {
                  columns: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            inventoryAssignment: {
              columns: {
                inventoryId: true,
                assignmentDate: true,
                assignmentId: true,
              },
            },
          }
        : undefined,
    });

    return await query;
  }

  async getHistoryByUser(
    userId: number,
    includeRelations = false
  ): Promise<StatusHistoryEntry[]> {
    const query = db.query.inventoryStatusHistory.findMany({
      where: eq(inventoryStatusHistory.changedBy, userId),
      orderBy: desc(inventoryStatusHistory.changedAt),
      with: includeRelations
        ? {
            changedByUser: {
              columns: {
                userId: true,
                email: true,
              },
              with: {
                userProfile: {
                  columns: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            inventoryAssignment: {
              columns: {
                inventoryId: true,
                assignmentDate: true,
                assignmentId: true,
              },
            },
          }
        : undefined,
    });

    return await query;
  }

  /**
   * Find all consolidations that were performed on stale inventories
   * Useful for monitoring workflow recovery scenarios
   */
  async getStaleInventoryConsolidations(
    daysThreshold = 1
  ): Promise<StatusHistoryEntry[]> {
    const history = await db.query.inventoryStatusHistory.findMany({
      where: and(
        eq(inventoryStatusHistory.toStatus, "consolidated")
        // Look for notes containing stale inventory indicators
      ),
      orderBy: desc(inventoryStatusHistory.changedAt),
      with: {
        changedByUser: {
          columns: {
            userId: true,
            email: true,
          },
          with: {
            userProfile: {
              columns: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        inventoryAssignment: {
          columns: {
            inventoryId: true,
            assignmentDate: true,
            assignmentId: true,
          },
        },
      },
    });

    // Filter for stale inventory consolidations based on notes
    return history.filter(
      (entry) =>
        entry.notes?.includes("RECUPERACIÓN DE WORKFLOW") ||
        entry.notes?.includes("rezagado") ||
        entry.notes?.includes("recuperación")
    );
  }

  /**
   * Generate audit report for a date range
   */
  async getAuditReport(
    startDate: string,
    endDate: string
  ): Promise<{
    totalChanges: number;
    changesByStatus: Record<string, number>;
    automatedChanges: number;
    manualChanges: number;
    staleRecoveries: number;
  }> {
    const history = await this.getHistoryByDateRange(startDate, endDate, false);

    const changesByStatus: Record<string, number> = {};
    let automatedChanges = 0;
    let manualChanges = 0;
    let staleRecoveries = 0;

    for (const entry of history) {
      // Count by status transitions
      const transitionKey = `${entry.fromStatus || "null"}_to_${
        entry.toStatus
      }`;
      changesByStatus[transitionKey] =
        (changesByStatus[transitionKey] || 0) + 1;

      // Count automated vs manual
      if (
        entry.reason?.includes("automática") ||
        entry.reason?.includes("Consolidación automática")
      ) {
        automatedChanges++;
      } else {
        manualChanges++;
      }

      // Count stale recoveries
      if (
        entry.notes?.includes("ESCENARIO ESPECIAL") ||
        entry.notes?.includes("rezagado") ||
        entry.notes?.includes("recuperación")
      ) {
        staleRecoveries++;
      }
    }

    return {
      totalChanges: history.length,
      changesByStatus,
      automatedChanges,
      manualChanges,
      staleRecoveries,
    };
  }
}
