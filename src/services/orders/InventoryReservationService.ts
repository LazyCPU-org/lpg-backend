import { db } from "../../db";
import { ItemTypeEnum, ReservationStatusEnum } from "../../db/schemas";
import type { InventoryReservationType } from "../../dtos/response/orderInterface";
import { IInventoryTransactionRepository } from "../../repositories/inventory/IInventoryTransactionRepository";
import { IInventoryReservationRepository } from "../../repositories/orders/IInventoryReservationRepository";
import { BadRequestError, NotFoundError } from "../../utils/custom-errors";
import { IInventoryReservationService } from "./IInventoryReservationService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class InventoryReservationService
  implements IInventoryReservationService
{
  constructor(
    private reservationRepository: IInventoryReservationRepository,
    private transactionRepository: IInventoryTransactionRepository
  ) {}

  async createReservation(
    orderId: number,
    storeId: number,
    items: Array<{
      itemType: ItemTypeEnum;
      itemId: number;
      quantity: number;
    }>,
    requestedBy: number,
    expiresAt?: Date,
    notes?: string
  ): Promise<{
    successful: boolean;
    reservations: InventoryReservationType[];
    errors: string[];
  }> {
    return await db.transaction(async (trx) => {
      const errors: string[] = [];
      const reservations: InventoryReservationType[] = [];

      // Check availability first
      const availabilityCheck = await this.checkAvailability(storeId, items);
      if (!availabilityCheck.available) {
        const insufficientItems = availabilityCheck.items
          .filter((item) => !item.canFulfill)
          .map((item) => `${item.itemType} ID ${item.itemId}`);

        errors.push(`Insufficient inventory: ${insufficientItems.join(", ")}`);
        return {
          successful: false,
          reservations: [],
          errors,
        };
      }

      // Create reservations for each item
      for (const item of items) {
        try {
          // For now, create reservation with simplified parameters
          // TODO: Get actual assignment and inventory IDs from store
          const reservation =
            await this.reservationRepository.createReservation(
              orderId,
              0, // assignmentId - TODO: get from store
              0, // currentInventoryId - TODO: get from store
              item.itemType,
              item.itemType === "tank" ? item.itemId : null,
              item.itemType === "item" ? item.itemId : null,
              item.quantity,
              expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
            );
          reservations.push(reservation);
        } catch (error) {
          errors.push(
            `Failed to reserve ${item.itemType} ID ${item.itemId}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return {
        successful: errors.length === 0,
        reservations,
        errors,
      };
    });
  }

  async modifyReservation(
    orderId: number,
    modifications: Array<{
      itemType: "tank" | "item";
      itemId: number;
      newQuantity: number;
    }>,
    userId: number
  ): Promise<{
    successful: boolean;
    reservations: InventoryReservationType[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const reservations: InventoryReservationType[] = [];

    for (const modification of modifications) {
      try {
        // Find reservations for this order first, then update via status
        const reservations = await this.reservationRepository.findByOrderId(
          orderId
        );
        const targetReservation = reservations.find(
          (r) =>
            r.itemType === modification.itemType &&
            ((modification.itemType === "tank" &&
              r.tankTypeId === modification.itemId) ||
              (modification.itemType === "item" &&
                r.inventoryItemId === modification.itemId))
        );

        if (!targetReservation) {
          throw new NotFoundError(
            `Reservation not found for ${modification.itemType} ID ${modification.itemId}`
          );
        }

        // For now, we'll update status - quantity modification needs more complex logic
        const updated =
          await this.reservationRepository.updateReservationStatus(
            targetReservation.reservationId,
            ReservationStatusEnum.ACTIVE
          );
        if (updated) {
          reservations.push(updated);
        }
      } catch (error) {
        errors.push(
          `Failed to modify reservation for ${modification.itemType} ID ${
            modification.itemId
          }: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return {
      successful: errors.length === 0,
      reservations,
      errors,
    };
  }

  async cancelReservation(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<{
    restored: boolean;
    restoredQuantities: Array<{
      itemType: string;
      itemId: number;
      quantityRestored: number;
    }>;
    errors: string[];
  }> {
    return await db.transaction(async (trx) => {
      const errors: string[] = [];
      const restoredQuantities: Array<{
        itemType: string;
        itemId: number;
        quantityRestored: number;
      }> = [];

      try {
        // Get all active reservations for this order
        const reservations = await this.reservationRepository.findByOrderId(
          orderId
        );

        // Cancel each reservation
        for (const reservation of reservations) {
          if (reservation.status === "active") {
            await this.reservationRepository.updateReservationStatus(
              reservation.reservationId,
              ReservationStatusEnum.CANCELLED
            );

            restoredQuantities.push({
              itemType: reservation.itemType,
              itemId:
                reservation.tankTypeId || reservation.inventoryItemId || 0,
              quantityRestored: reservation.reservedQuantity,
            });
          }
        }

        return {
          restored: true,
          restoredQuantities,
          errors,
        };
      } catch (error) {
        errors.push(
          `Failed to cancel reservations: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return {
          restored: false,
          restoredQuantities: [],
          errors,
        };
      }
    });
  }

  async checkAvailability(
    storeId: number,
    items: Array<{
      itemType: "tank" | "item";
      itemId: number;
      quantity: number;
    }>
  ): Promise<{
    available: boolean;
    items: Array<{
      itemType: string;
      itemId: number;
      requestedQuantity: number;
      availableQuantity: number;
      canFulfill: boolean;
    }>;
  }> {
    const itemResults = [];
    let allAvailable = true;

    for (const item of items) {
      try {
        // Check availability using the checkAvailability method
        const availabilityCheck =
          await this.reservationRepository.checkAvailability(storeId, [
            {
              itemType: item.itemType,
              itemId: item.itemId,
              requiredQuantity: item.quantity,
            },
          ]);

        const availability = {
          availableQuantity: availabilityCheck.items[0]?.availableQuantity || 0,
          canFulfill: availabilityCheck.items[0]?.sufficient || false,
        };

        itemResults.push({
          itemType: item.itemType,
          itemId: item.itemId,
          requestedQuantity: item.quantity,
          availableQuantity: availability.availableQuantity,
          canFulfill: availability.canFulfill,
        });

        if (!availability.canFulfill) {
          allAvailable = false;
        }
      } catch (error) {
        itemResults.push({
          itemType: item.itemType,
          itemId: item.itemId,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          canFulfill: false,
        });
        allAvailable = false;
      }
    }

    return {
      available: allAvailable,
      items: itemResults,
    };
  }

  async fulfillReservation(
    orderId: number,
    userId: number,
    actualItems?: Array<{
      itemType: "tank" | "item";
      itemId: number;
      deliveredQuantity: number;
    }>,
    customerSignature?: string,
    notes?: string
  ): Promise<{
    fulfilled: boolean;
    transactionIds: number[];
    discrepancies: Array<{
      itemType: string;
      itemId: number;
      reserved: number;
      delivered: number;
    }>;
  }> {
    return await db.transaction(async (trx) => {
      const transactionIds: number[] = [];
      const discrepancies: Array<{
        itemType: string;
        itemId: number;
        reserved: number;
        delivered: number;
      }> = [];

      try {
        // Get all active reservations for this order
        const reservations = await this.reservationRepository.findByOrderId(
          orderId
        );

        // Fulfill each reservation by creating inventory transactions
        for (const reservation of reservations) {
          if (reservation.status === "active") {
            const itemId =
              reservation.tankTypeId || reservation.inventoryItemId || 0;
            const actualItem = actualItems?.find(
              (item) =>
                item.itemType === reservation.itemType && item.itemId === itemId
            );

            const deliveredQuantity =
              actualItem?.deliveredQuantity || reservation.reservedQuantity;

            // Track discrepancies
            if (deliveredQuantity !== reservation.reservedQuantity) {
              discrepancies.push({
                itemType: reservation.itemType,
                itemId: itemId,
                reserved: reservation.reservedQuantity,
                delivered: deliveredQuantity,
              });
            }

            // Create inventory transaction (sale)
            if (reservation.itemType === "tank") {
              await this.transactionRepository.decrementTankByInventoryId(
                reservation.currentInventoryId || 0, // Using currentInventoryId from reservation
                reservation.tankTypeId || 0,
                deliveredQuantity,
                0, // empty tanks change
                "sale",
                userId,
                `Order fulfillment - Order #${orderId}`
              );
              transactionIds.push(0); // Transaction ID would be returned by transaction repository
            } else {
              await this.transactionRepository.decrementItemByInventoryId(
                reservation.currentInventoryId || 0, // Using currentInventoryId from reservation
                reservation.inventoryItemId || 0,
                deliveredQuantity,
                "sale",
                userId,
                `Order fulfillment - Order #${orderId}`
              );
              transactionIds.push(0); // Transaction ID would be returned by transaction repository
            }

            // Mark reservation as fulfilled
            await this.reservationRepository.updateReservationStatus(
              reservation.reservationId,
              ReservationStatusEnum.FULFILLED
            );
          }
        }

        return {
          fulfilled: true,
          transactionIds,
          discrepancies,
        };
      } catch (error) {
        throw new BadRequestError(
          `Failed to fulfill reservation: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });
  }

  async restoreReservation(
    orderId: number,
    reason: string,
    userId: number
  ): Promise<{
    restored: boolean;
    restoredQuantities: Array<{
      itemType: string;
      itemId: number;
      quantityRestored: number;
    }>;
    errors: string[];
  }> {
    return await this.cancelReservation(orderId, reason, userId);
  }

  async getReservationMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalReservations: number;
    activeReservations: number;
    expiredReservations: number;
    fulfillmentRate: number;
  }> {
    const dateRange =
      fromDate && toDate ? { from: fromDate, to: toDate } : undefined;
    const metrics = await this.reservationRepository.getReservationMetrics(
      storeId,
      dateRange
    );

    return {
      totalReservations: 0, // TODO: extract from metrics.totalActiveReservations
      activeReservations: metrics.totalActiveReservations,
      expiredReservations: metrics.expiringSoon, // Approximate mapping
      fulfillmentRate: 0, // TODO: calculate from metrics data
    };
  }
}
