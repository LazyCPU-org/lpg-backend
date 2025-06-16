import { and, eq, lt } from "drizzle-orm";
import { db } from "../../../db";
import { ReservationStatusEnum } from "../../../db/schemas/orders";
import { inventoryReservations } from "../../../db/schemas/orders/inventory-reservations";
import type { InventoryReservationType } from "../../../dtos/response/orderInterface";
import { BadRequestError, InternalError, NotFoundError } from "../../../utils/custom-errors";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ReservationUtils {
  // Expiration Management
  static async expireOldReservations(thresholdHours: number = 24): Promise<number> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - thresholdHours);

    const result = await db
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.EXPIRED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE),
          lt(inventoryReservations.createdAt, thresholdDate)
        )
      );

    return result.rowCount || 0;
  }

  static async restoreExpiredReservations(orderId: number): Promise<void> {
    await db
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.ACTIVE,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.EXPIRED)
        )
      );
  }

  static async extendReservationExpiry(
    reservationId: number,
    newExpiryDate: Date
  ): Promise<InventoryReservationType> {
    // Find current reservation first
    const current = await db.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.reservationId, reservationId),
    });

    if (!current) {
      throw new NotFoundError("Reservation not found");
    }

    if (current.status !== ReservationStatusEnum.ACTIVE) {
      throw new BadRequestError(
        "Cannot extend expiry of non-active reservation"
      );
    }

    const results = await db
      .update(inventoryReservations)
      .set({
        expiresAt: newExpiryDate,
        updatedAt: new Date(),
      })
      .where(eq(inventoryReservations.reservationId, reservationId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error extending reservation expiry");
    }

    return results[0] as InventoryReservationType;
  }

  static async setReservationExpiry(orderId: number, expiresAt: Date): Promise<void> {
    await db
      .update(inventoryReservations)
      .set({
        expiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      );
  }

  // Bulk Operations
  static async bulkCancelReservations(orderIds: number[]): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }> {
    const successful: number[] = [];
    const failed: Array<{ orderId: number; error: string }> = [];

    // Process each order individually to handle failures gracefully
    for (const orderId of orderIds) {
      try {
        await ReservationUtils.cancelReservations(orderId);
        successful.push(orderId);
      } catch (error) {
        failed.push({
          orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  // Status Management Utilities
  static async cancelReservations(orderId: number): Promise<void> {
    await db
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.CANCELLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      );
  }

  static async fulfillReservations(orderId: number): Promise<void> {
    await db
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.FULFILLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      );
  }

  // Transaction-aware versions
  static async cancelReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void> {
    await trx
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.CANCELLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      );
  }

  static async fulfillReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void> {
    await trx
      .update(inventoryReservations)
      .set({
        status: ReservationStatusEnum.FULFILLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, ReservationStatusEnum.ACTIVE)
        )
      );
  }
}