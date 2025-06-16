import { ItemTypeEnum, ReservationStatusEnum } from "../../../db/schemas/orders";
import type {
  InventoryReservationType,
  InventoryReservationWithDetails,
} from "../../../dtos/response/orderInterface";

export abstract class IReservationQueryService {
  // Basic query operations
  abstract findByOrderId(orderId: number): Promise<InventoryReservationType[]>;

  abstract findByOrderIdWithDetails(
    orderId: number
  ): Promise<InventoryReservationWithDetails[]>;

  abstract findActiveReservations(
    assignmentId: number
  ): Promise<InventoryReservationType[]>;

  abstract findReservationById(
    reservationId: number
  ): Promise<InventoryReservationType | null>;

  abstract getActiveReservationsByStore(
    storeId: number
  ): Promise<InventoryReservationType[]>;

  abstract findExpiringReservations(
    thresholdHours?: number
  ): Promise<InventoryReservationType[]>;

  abstract getReservationHistory(
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
  >;

  abstract findConflictingReservations(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<InventoryReservationType[]>;

  abstract getReservedQuantityByItem(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<number>;
}