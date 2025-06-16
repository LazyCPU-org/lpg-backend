import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../../db";
import { storeAssignmentCurrentInventory } from "../../../db/schemas/locations/store-assignment-current-inventory";
import { storeAssignments } from "../../../db/schemas/locations/store-assignments";
import { ItemTypeEnum, ReservationStatusEnum } from "../../../db/schemas/orders";
import { inventoryReservations } from "../../../db/schemas/orders/inventory-reservations";
import type {
  InventoryReservationType,
  InventoryReservationWithDetails,
} from "../../../dtos/response/orderInterface";
import { IReservationQueryService } from "./IReservationQueryService";

export class ReservationQueryService implements IReservationQueryService {
  async findByOrderId(orderId: number): Promise<InventoryReservationType[]> {
    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId))
      .orderBy(desc(inventoryReservations.createdAt));

    return reservations as InventoryReservationType[];
  }

  async findByOrderIdWithDetails(
    orderId: number
  ): Promise<InventoryReservationWithDetails[]> {
    const reservations = await db.query.inventoryReservations.findMany({
      where: eq(inventoryReservations.orderId, orderId),
      orderBy: [desc(inventoryReservations.createdAt)],
      with: {
        storeAssignment: true,
        tankType: true,
        inventoryItem: true,
      },
    });

    return reservations as InventoryReservationWithDetails[];
  }

  async findActiveReservations(
    assignmentId: number
  ): Promise<InventoryReservationType[]> {
    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.assignmentId, assignmentId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      )
      .orderBy(desc(inventoryReservations.createdAt));

    return reservations as InventoryReservationType[];
  }

  async findReservationById(
    reservationId: number
  ): Promise<InventoryReservationType | null> {
    const reservation = await db.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.reservationId, reservationId),
    });

    return (reservation as InventoryReservationType) || null;
  }

  async getActiveReservationsByStore(
    storeId: number
  ): Promise<InventoryReservationType[]> {
    const currentAssignment = await this.getCurrentStoreAssignment(storeId);

    if (!currentAssignment) {
      return [];
    }

    return await this.findActiveReservations(currentAssignment.assignmentId);
  }

  async findExpiringReservations(
    thresholdHours: number = 2
  ): Promise<InventoryReservationType[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() + thresholdHours);

    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
          lte(inventoryReservations.expiresAt, thresholdDate)
        )
      )
      .orderBy(asc(inventoryReservations.expiresAt));

    return reservations as InventoryReservationType[];
  }

  async getReservationHistory(
    storeId?: number,
    dateRange?: { from: Date; to: Date },
    limit?: number
  ): Promise<
    Array<{
      reservationId: number;
      orderId: number;
      orderNumber: string;
      customerName: string;
      itemType: string;
      itemName: string;
      quantity: number;
      status: string;
      createdAt: Date;
      fulfilledAt?: Date;
      duration?: number;
    }>
  > {
    const whereConditions = [];

    if (storeId) {
      const currentAssignment = await this.getCurrentStoreAssignment(storeId);
      if (currentAssignment) {
        whereConditions.push(
          eq(inventoryReservations.assignmentId, currentAssignment.assignmentId)
        );
      } else {
        return [];
      }
    }

    if (dateRange) {
      whereConditions.push(
        gte(inventoryReservations.createdAt, dateRange.from)
      );
      whereConditions.push(lte(inventoryReservations.createdAt, dateRange.to));
    }

    const history = await db.query.inventoryReservations.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(inventoryReservations.createdAt)],
      limit: limit || 100,
      with: {
        order: true,
        tankType: true,
        inventoryItem: true,
      },
    });

    return history.map((reservation) => {
      const itemName =
        reservation.tankType?.name ||
        reservation.inventoryItem?.name ||
        `${reservation.itemType} ID ${
          reservation.tankTypeId || reservation.inventoryItemId
        }`;

      let fulfilledAt: Date | undefined;
      let duration: number | undefined;

      if (
        reservation.status === ReservationStatusEnum.FULFILLED &&
        reservation.updatedAt
      ) {
        fulfilledAt = new Date(reservation.updatedAt);
        const createdAt = new Date(reservation.createdAt || new Date());
        duration = Math.round(
          (fulfilledAt.getTime() - createdAt.getTime()) / (1000 * 60)
        ); // minutes
      }

      return {
        reservationId: reservation.reservationId,
        orderId: reservation.orderId,
        orderNumber:
          reservation.order?.orderNumber || `ORD-${reservation.orderId}`,
        customerName: reservation.order?.customerName || "Unknown Customer",
        itemType: reservation.itemType,
        itemName,
        quantity: reservation.reservedQuantity,
        status: reservation.status || "unknown",
        createdAt: new Date(reservation.createdAt || new Date()),
        fulfilledAt,
        duration,
      };
    });
  }

  async findConflictingReservations(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<InventoryReservationType[]> {
    const whereConditions = [
      eq(inventoryReservations.assignmentId, assignmentId),
      eq(inventoryReservations.itemType, itemType),
      eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
    ];

    if (itemType === ItemTypeEnum.TANK) {
      whereConditions.push(eq(inventoryReservations.tankTypeId, itemId));
    } else {
      whereConditions.push(eq(inventoryReservations.inventoryItemId, itemId));
    }

    if (excludeOrderId) {
      whereConditions.push(
        sql`${inventoryReservations.orderId} != ${excludeOrderId}`
      );
    }

    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(and(...whereConditions))
      .orderBy(desc(inventoryReservations.createdAt));

    return reservations as InventoryReservationType[];
  }

  async getReservedQuantityByItem(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<number> {
    const whereConditions = [
      eq(inventoryReservations.assignmentId, assignmentId),
      eq(inventoryReservations.itemType, itemType),
      eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
    ];

    if (itemType === ItemTypeEnum.TANK) {
      whereConditions.push(eq(inventoryReservations.tankTypeId, itemId));
    } else {
      whereConditions.push(eq(inventoryReservations.inventoryItemId, itemId));
    }

    if (excludeOrderId) {
      whereConditions.push(
        sql`${inventoryReservations.orderId} != ${excludeOrderId}`
      );
    }

    const result = await db
      .select({
        totalReserved: sql<string>`COALESCE(SUM(${inventoryReservations.reservedQuantity}), 0)`,
      })
      .from(inventoryReservations)
      .where(and(...whereConditions));

    return parseInt(result[0]?.totalReserved || "0");
  }

  // Helper method for store assignment
  private async getCurrentStoreAssignment(storeId: number): Promise<{
    assignmentId: number;
    currentInventoryId: number;
    status: string;
  } | null> {
    const storeAssignment = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.storeId, storeId),
      with: {
        currentInventoryState: true,
      },
    });

    if (!storeAssignment || !storeAssignment.currentInventoryState) {
      return null;
    }

    return {
      assignmentId: storeAssignment.assignmentId,
      currentInventoryId:
        storeAssignment.currentInventoryState.currentInventoryId,
      status: "active",
    };
  }
}