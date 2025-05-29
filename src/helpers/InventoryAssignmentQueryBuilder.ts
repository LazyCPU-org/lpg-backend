import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { inventoryAssignments } from "../db/schemas/inventory";
import { storeAssignments } from "../db/schemas/locations";
import {
  InventoryAssignmentRelationOptions,
  StatusType,
} from "../dtos/response/inventoryAssignmentInterface";

export class InventoryAssignmentQueryBuilder {
  /**
   * Builds the relation query options for drizzle queries
   */
  static buildRelationQueryOptions(
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

  /**
   * Gets relevant assignment IDs based on user/store filters
   */
  static async getRelevantAssignmentIds(
    userId?: number,
    storeId?: number
  ): Promise<number[] | undefined> {
    if (!userId && !storeId) {
      return undefined;
    }

    const assignments = await db.query.storeAssignments.findMany({
      where: and(
        userId ? eq(storeAssignments.userId, userId) : undefined,
        storeId ? eq(storeAssignments.storeId, storeId) : undefined
      ),
    });

    if (assignments.length === 0) {
      return []; // Return empty array to indicate no results should be found
    }

    return assignments.map((a) => a.assignmentId);
  }

  /**
   * Builds where conditions for inventory assignment queries
   */
  static buildWhereConditions(
    status?: StatusType,
    date?: string,
    relevantAssignmentIds?: number[]
  ) {
    const whereConditions = [];

    if (status) {
      whereConditions.push(eq(inventoryAssignments.status, status));
    }

    if (date) {
      whereConditions.push(eq(inventoryAssignments.assignmentDate, date));
    }

    if (relevantAssignmentIds !== undefined) {
      if (relevantAssignmentIds.length === 0) {
        // No matching assignments found, return a condition that will never match
        whereConditions.push(eq(inventoryAssignments.inventoryId, -1));
      } else {
        whereConditions.push(
          inArray(inventoryAssignments.assignmentId, relevantAssignmentIds)
        );
      }
    }

    return whereConditions;
  }
}
