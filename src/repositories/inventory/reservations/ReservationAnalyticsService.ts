import { and, count, desc, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "../../../db";
import { assignmentItems } from "../../../db/schemas/inventory/inventory-assignments-items";
import { assignmentTanks } from "../../../db/schemas/inventory/inventory-assignments-tanks";
import { storeAssignmentCurrentInventory } from "../../../db/schemas/locations/store-assignment-current-inventory";
import { ItemTypeEnum, ReservationStatusEnum } from "../../../db/schemas/orders";
import { inventoryReservations } from "../../../db/schemas/orders/inventory-reservations";
import type { InventoryReservationType } from "../../../dtos/response/orderInterface";
import type { 
  ReservationMetrics, 
  OrderReservationSummary 
} from "./IInventoryReservationRepository";
import { IReservationAnalyticsService } from "./IReservationAnalyticsService";
import { IReservationAvailabilityService } from "./IReservationAvailabilityService";
import { IReservationQueryService } from "./IReservationQueryService";

export class ReservationAnalyticsService implements IReservationAnalyticsService {
  constructor(
    private reservationQueryService: IReservationQueryService,
    private availabilityService: IReservationAvailabilityService
  ) {}

  async getReservationMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<ReservationMetrics> {
    const whereConditions = [];

    if (storeId) {
      // Get assignment for the store
      const currentAssignment = await this.availabilityService.getCurrentStoreAssignment(storeId);
      if (currentAssignment) {
        whereConditions.push(
          eq(inventoryReservations.assignmentId, currentAssignment.assignmentId)
        );
      } else {
        // No assignment, return empty metrics
        return {
          totalActiveReservations: 0,
          totalReservedValue: "0.00",
          reservationsByStatus: {},
          expiringSoon: 0,
          averageReservationDuration: 0,
          topReservedItems: [],
        };
      }
    }

    if (dateRange) {
      whereConditions.push(
        gte(inventoryReservations.createdAt, dateRange.from)
      );
      whereConditions.push(lte(inventoryReservations.createdAt, dateRange.to));
    }

    // Get total active reservations
    const [activeCount] = await db
      .select({
        count: count(inventoryReservations.reservationId),
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
          ...(whereConditions.length > 0 ? whereConditions : [])
        )
      );

    // Get reservations by status
    const statusCounts = await db
      .select({
        status: inventoryReservations.status,
        count: count(inventoryReservations.reservationId),
      })
      .from(inventoryReservations)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(inventoryReservations.status);

    const reservationsByStatus = statusCounts.reduce((acc, item) => {
      if (item.status) {
        acc[item.status] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get expiring soon count (next 2 hours)
    const expiringThreshold = new Date();
    expiringThreshold.setHours(expiringThreshold.getHours() + 2);

    const [expiringCount] = await db
      .select({
        count: count(inventoryReservations.reservationId),
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
          lte(inventoryReservations.expiresAt, expiringThreshold),
          ...(whereConditions.length > 0 ? whereConditions : [])
        )
      );

    // Get top reserved items (simplified)
    const topReservedItems = await db
      .select({
        itemType: inventoryReservations.itemType,
        tankTypeId: inventoryReservations.tankTypeId,
        inventoryItemId: inventoryReservations.inventoryItemId,
        totalReserved: sum(inventoryReservations.reservedQuantity),
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
          ...(whereConditions.length > 0 ? whereConditions : [])
        )
      )
      .groupBy(
        inventoryReservations.itemType,
        inventoryReservations.tankTypeId,
        inventoryReservations.inventoryItemId
      )
      .orderBy(desc(sum(inventoryReservations.reservedQuantity)))
      .limit(10);

    const topItems = topReservedItems.map((item) => ({
      itemType: item.itemType,
      itemId: item.tankTypeId || item.inventoryItemId || 0,
      itemName: `${item.itemType} ID ${
        item.tankTypeId || item.inventoryItemId
      }`,
      totalReserved: parseInt(item.totalReserved || "0"),
      totalValue: "0.00", // Would need pricing data
    }));

    return {
      totalActiveReservations: activeCount.count,
      totalReservedValue: "0.00", // Would need pricing integration
      reservationsByStatus,
      expiringSoon: expiringCount.count,
      averageReservationDuration: 24, // Simplified - would calculate from actual data
      topReservedItems: topItems,
    };
  }

  async getOrderReservationSummary(
    orderId: number
  ): Promise<OrderReservationSummary> {
    const reservations = await this.reservationQueryService.findByOrderId(orderId);

    if (reservations.length === 0) {
      return {
        orderId,
        totalReservations: 0,
        reservationStatus: "failed",
        items: [],
        totalValue: "0.00",
      };
    }

    const items = reservations.map((reservation) => ({
      itemType: reservation.itemType,
      itemId: reservation.tankTypeId || reservation.inventoryItemId || 0,
      requestedQuantity: reservation.reservedQuantity,
      reservedQuantity: reservation.reservedQuantity,
      status: reservation.status || "unknown",
    }));

    // Determine overall status
    const allFulfilled = reservations.every(
      (r) => r.status === ReservationStatusEnum.FULFILLED
    );
    const allActive = reservations.every(
      (r) => r.status === ReservationStatusEnum.ACTIVE
    );
    const anyCancelled = reservations.some(
      (r) => r.status === ReservationStatusEnum.CANCELLED
    );

    let reservationStatus: "complete" | "partial" | "failed";
    if (allFulfilled) {
      reservationStatus = "complete";
    } else if (allActive) {
      reservationStatus = "complete";
    } else if (anyCancelled) {
      reservationStatus = "failed";
    } else {
      reservationStatus = "partial";
    }

    // Get earliest expiry date
    const expiryDates = reservations
      .map((r) => r.expiresAt)
      .filter((date) => date !== null)
      .map((date) => new Date(date!));

    const expiresAt =
      expiryDates.length > 0
        ? new Date(Math.min(...expiryDates.map((d) => d.getTime())))
        : undefined;

    return {
      orderId,
      totalReservations: reservations.length,
      reservationStatus,
      items,
      totalValue: "0.00", // Would need pricing integration
      expiresAt,
    };
  }

  async calculateReservationValue(
    reservations: InventoryReservationType[]
  ): Promise<string> {
    // Simplified implementation - would need pricing data integration
    // For now, return 0 as we don't have pricing information
    return "0.00";
  }

  async optimizeReservations(assignmentId: number): Promise<{
    optimized: number;
    conflicts: Array<{
      itemType: string;
      itemId: number;
      totalReserved: number;
      available: number;
      shortage: number;
    }>;
  }> {
    // Get all active reservations for this assignment
    const activeReservations = await this.reservationQueryService.findActiveReservations(assignmentId);

    // Group by item type and ID
    const itemGroups = new Map<
      string,
      {
        itemType: ItemTypeEnum;
        itemId: number;
        reservations: InventoryReservationType[];
      }
    >();

    for (const reservation of activeReservations) {
      const itemId = reservation.tankTypeId || reservation.inventoryItemId || 0;
      const key = `${reservation.itemType}-${itemId}`;

      if (!itemGroups.has(key)) {
        itemGroups.set(key, {
          itemType: reservation.itemType as ItemTypeEnum,
          itemId,
          reservations: [],
        });
      }

      itemGroups.get(key)!.reservations.push(reservation);
    }

    const conflicts = [];
    let optimized = 0;

    // Check each item group for conflicts
    for (const [key, group] of itemGroups) {
      // Get current assignment to find inventory ID
      const currentAssignment =
        await db.query.storeAssignmentCurrentInventory.findFirst({
          where: eq(storeAssignmentCurrentInventory.assignmentId, assignmentId),
        });

      if (!currentAssignment) {
        continue;
      }

      // For simplicity, get current quantity directly here
      let currentQuantity = 0;
      if (group.itemType === ItemTypeEnum.TANK) {
        const tankInventory = await db
          .select({
            fullTanks: assignmentTanks.currentFullTanks,
            emptyTanks: assignmentTanks.currentEmptyTanks,
          })
          .from(assignmentTanks)
          .where(
            and(
              eq(assignmentTanks.inventoryId, currentAssignment.currentInventoryId),
              eq(assignmentTanks.tankTypeId, group.itemId)
            )
          )
          .limit(1);

        if (tankInventory.length > 0) {
          currentQuantity =
            (tankInventory[0].fullTanks || 0) +
            (tankInventory[0].emptyTanks || 0);
        }
      } else {
        const itemInventory = await db
          .select({
            quantity: assignmentItems.currentItems,
          })
          .from(assignmentItems)
          .where(
            and(
              eq(assignmentItems.inventoryId, currentAssignment.currentInventoryId),
              eq(assignmentItems.inventoryItemId, group.itemId)
            )
          )
          .limit(1);

        if (itemInventory.length > 0) {
          currentQuantity = itemInventory[0].quantity || 0;
        }
      }

      const totalReserved = group.reservations.reduce(
        (sum, r) => sum + r.reservedQuantity,
        0
      );

      if (totalReserved > currentQuantity) {
        const shortage = totalReserved - currentQuantity;
        conflicts.push({
          itemType: group.itemType,
          itemId: group.itemId,
          totalReserved,
          available: currentQuantity,
          shortage,
        });
      }
    }

    return {
      optimized,
      conflicts,
    };
  }

}