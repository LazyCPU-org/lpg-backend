import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { ItemTypeEnum, ReservationStatusEnum } from "../../../db/schemas/orders";
import { inventoryReservations } from "../../../db/schemas/orders/inventory-reservations";
import type {
  InventoryReservationType,
  InventoryReservationWithDetails,
} from "../../../dtos/response/orderInterface";
import {
  BadRequestError,
  ConflictError,
  InternalError,
  NotFoundError,
} from "../../../utils/custom-errors";
import type {
  AvailabilityCheckItem,
  AvailabilityResult,
  OrderItemRequest,
  OrderReservationSummary,
  ReservationMetrics,
} from "./IInventoryReservationRepository";
import { IInventoryReservationRepository } from "./IInventoryReservationRepository";
import { IReservationAnalyticsService } from "./IReservationAnalyticsService";
import { IReservationAvailabilityService } from "./IReservationAvailabilityService";
import { IReservationQueryService } from "./IReservationQueryService";
import { IReservationValidationService } from "./IReservationValidationService";
import { ReservationAnalyticsService } from "./ReservationAnalyticsService";
import { ReservationAvailabilityService } from "./ReservationAvailabilityService";
import { ReservationQueryService } from "./ReservationQueryService";
import { ReservationUtils } from "./ReservationUtils";
import { ReservationValidationService } from "./ReservationValidationService";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgInventoryReservationRepository implements IInventoryReservationRepository {
  private reservationQueryService: IReservationQueryService;
  private reservationAvailabilityService: IReservationAvailabilityService;
  private reservationAnalyticsService: IReservationAnalyticsService;
  private reservationValidationService: IReservationValidationService;

  constructor() {
    this.reservationQueryService = new ReservationQueryService();
    this.reservationAvailabilityService = new ReservationAvailabilityService(
      this.reservationQueryService
    );
    this.reservationAnalyticsService = new ReservationAnalyticsService(
      this.reservationQueryService,
      this.reservationAvailabilityService
    );
    this.reservationValidationService = new ReservationValidationService(
      this.reservationAvailabilityService
    );
  }

  // Core CRUD operations
  async createReservation(
    orderId: number,
    assignmentId: number,
    currentInventoryId: number,
    itemType: ItemTypeEnum,
    tankTypeId: number | null,
    inventoryItemId: number | null,
    quantity: number,
    expiresAt?: Date
  ): Promise<InventoryReservationType> {
    // Validate that either tankTypeId or inventoryItemId is provided based on itemType
    if (itemType === ItemTypeEnum.TANK && !tankTypeId) {
      throw new BadRequestError("tankTypeId is required for tank reservations");
    }
    if (itemType === ItemTypeEnum.ITEM && !inventoryItemId) {
      throw new BadRequestError(
        "inventoryItemId is required for item reservations"
      );
    }

    const reservationData = {
      orderId,
      assignmentId,
      currentInventoryId,
      itemType,
      tankTypeId,
      inventoryItemId,
      reservedQuantity: quantity,
      status: ReservationStatusEnum.ACTIVE,
      expiresAt,
    };

    const results = await db
      .insert(inventoryReservations)
      .values(reservationData)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating reservation");
    }

    return results[0] as InventoryReservationType;
  }

  async updateReservationStatus(
    reservationId: number,
    status: ReservationStatusEnum
  ): Promise<InventoryReservationType> {
    const current = await this.findReservationById(reservationId);
    if (!current) {
      throw new NotFoundError("Reservation not found");
    }

    const results = await db
      .update(inventoryReservations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(inventoryReservations.reservationId, reservationId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating reservation status");
    }

    return results[0] as InventoryReservationType;
  }

  // Transaction-aware core operations
  async createReservationWithTransaction(
    trx: DbTransaction,
    orderId: number,
    assignmentId: number,
    currentInventoryId: number,
    itemType: ItemTypeEnum,
    tankTypeId: number | null,
    inventoryItemId: number | null,
    quantity: number,
    expiresAt?: Date
  ): Promise<InventoryReservationType> {
    const reservationData = {
      orderId,
      assignmentId,
      currentInventoryId,
      itemType,
      tankTypeId,
      inventoryItemId,
      reservedQuantity: quantity,
      status: ReservationStatusEnum.ACTIVE,
      expiresAt,
    };

    const results = await trx
      .insert(inventoryReservations)
      .values(reservationData)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating reservation");
    }

    return results[0] as InventoryReservationType;
  }

  async updateReservationStatusWithTransaction(
    trx: DbTransaction,
    reservationId: number,
    status: ReservationStatusEnum
  ): Promise<InventoryReservationType> {
    const results = await trx
      .update(inventoryReservations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(inventoryReservations.reservationId, reservationId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating reservation status");
    }

    return results[0] as InventoryReservationType;
  }

  // Integration with Inventory System
  async reserveInventoryItems(
    orderId: number,
    storeId: number,
    items: OrderItemRequest[],
    expiresAt?: Date
  ): Promise<InventoryReservationType[]> {
    return await db.transaction(async (trx) => {
      // Get current store assignment
      const currentAssignment = await this.getCurrentStoreAssignment(storeId);

      if (!currentAssignment) {
        throw new BadRequestError("No active store assignment found");
      }

      // Validate availability before reserving
      const availabilityCheck = await this.checkAvailability(
        storeId,
        items.map((item) => ({
          itemType: item.itemType,
          itemId: item.itemId,
          requiredQuantity: item.quantity,
        }))
      );

      if (!availabilityCheck.available) {
        const insufficientItems = availabilityCheck.items
          .filter((item) => !item.sufficient)
          .map(
            (item) =>
              `${item.itemType} ID ${item.itemId} (need ${item.requiredQuantity}, available ${item.availableQuantity})`
          )
          .join(", ");

        throw new ConflictError(`Insufficient inventory: ${insufficientItems}`);
      }

      // Create reservations for each item
      const reservations: InventoryReservationType[] = [];

      for (const item of items) {
        const reservation = await this.createReservationWithTransaction(
          trx,
          orderId,
          currentAssignment.assignmentId,
          currentAssignment.currentInventoryId,
          item.itemType as ItemTypeEnum,
          item.itemType === "tank" ? item.itemId : null,
          item.itemType === "item" ? item.itemId : null,
          item.quantity,
          expiresAt
        );

        reservations.push(reservation);
      }

      return reservations;
    });
  }

  async bulkReserveItems(
    reservationRequests: Array<{
      orderId: number;
      storeId: number;
      items: OrderItemRequest[];
      expiresAt?: Date;
    }>
  ): Promise<{
    successful: Array<{
      orderId: number;
      reservations: InventoryReservationType[];
    }>;
    failed: Array<{
      orderId: number;
      error: string;
    }>;
  }> {
    const successful: Array<{
      orderId: number;
      reservations: InventoryReservationType[];
    }> = [];
    const failed: Array<{
      orderId: number;
      error: string;
    }> = [];

    // Process each reservation request individually to handle failures gracefully
    for (const request of reservationRequests) {
      try {
        const reservations = await this.reserveInventoryItems(
          request.orderId,
          request.storeId,
          request.items,
          request.expiresAt
        );
        successful.push({
          orderId: request.orderId,
          reservations,
        });
      } catch (error) {
        failed.push({
          orderId: request.orderId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  // Delegated query operations
  async findByOrderId(orderId: number): Promise<InventoryReservationType[]> {
    return this.reservationQueryService.findByOrderId(orderId);
  }

  async findByOrderIdWithDetails(
    orderId: number
  ): Promise<InventoryReservationWithDetails[]> {
    return this.reservationQueryService.findByOrderIdWithDetails(orderId);
  }

  async findActiveReservations(
    assignmentId: number
  ): Promise<InventoryReservationType[]> {
    return this.reservationQueryService.findActiveReservations(assignmentId);
  }

  async findReservationById(
    reservationId: number
  ): Promise<InventoryReservationType | null> {
    return this.reservationQueryService.findReservationById(reservationId);
  }

  async getActiveReservationsByStore(
    storeId: number
  ): Promise<InventoryReservationType[]> {
    return this.reservationQueryService.getActiveReservationsByStore(storeId);
  }

  async findExpiringReservations(
    thresholdHours?: number
  ): Promise<InventoryReservationType[]> {
    return this.reservationQueryService.findExpiringReservations(thresholdHours);
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
    return this.reservationQueryService.getReservationHistory(
      storeId,
      dateRange,
      limit
    );
  }

  async findConflictingReservations(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<InventoryReservationType[]> {
    return this.reservationQueryService.findConflictingReservations(
      assignmentId,
      itemType,
      itemId,
      excludeOrderId
    );
  }

  async getReservedQuantityByItem(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<number> {
    return this.reservationQueryService.getReservedQuantityByItem(
      assignmentId,
      itemType,
      itemId,
      excludeOrderId
    );
  }

  // Delegated availability operations
  async checkAvailability(
    storeId: number,
    items: AvailabilityCheckItem[]
  ): Promise<AvailabilityResult> {
    return this.reservationAvailabilityService.checkAvailability(storeId, items);
  }

  async getAvailableQuantity(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number
  ): Promise<number> {
    return this.reservationAvailabilityService.getAvailableQuantity(
      assignmentId,
      itemType,
      itemId
    );
  }

  async getCurrentInventoryStatus(storeId: number): Promise<{
    assignmentId: number;
    tanks: Array<{
      tankTypeId: number;
      currentQuantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    }>;
    items: Array<{
      inventoryItemId: number;
      currentQuantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    }>;
  }> {
    return this.reservationAvailabilityService.getCurrentInventoryStatus(storeId);
  }

  async canReserveQuantity(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    quantity: number,
    excludeOrderId?: number
  ): Promise<{
    canReserve: boolean;
    availableQuantity: number;
    currentQuantity: number;
    reservedQuantity: number;
    message?: string;
  }> {
    return this.reservationAvailabilityService.canReserveQuantity(
      assignmentId,
      itemType,
      itemId,
      quantity,
      excludeOrderId
    );
  }

  async getCurrentStoreAssignment(storeId: number): Promise<{
    assignmentId: number;
    currentInventoryId: number;
    status: string;
  } | null> {
    return this.reservationAvailabilityService.getCurrentStoreAssignment(storeId);
  }

  // Delegated validation operations
  async validateReservationRequest(
    storeId: number,
    items: OrderItemRequest[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return this.reservationValidationService.validateReservationRequest(
      storeId,
      items
    );
  }

  async validateReservationLimits(
    orderId: number,
    items: OrderItemRequest[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    limits: Array<{
      itemType: string;
      itemId: number;
      maxAllowed: number;
      requested: number;
    }>;
  }> {
    return this.reservationValidationService.validateReservationLimits(
      orderId,
      items
    );
  }

  // Delegated analytics operations
  async getReservationMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<ReservationMetrics> {
    return this.reservationAnalyticsService.getReservationMetrics(
      storeId,
      dateRange
    );
  }

  async getOrderReservationSummary(
    orderId: number
  ): Promise<OrderReservationSummary> {
    return this.reservationAnalyticsService.getOrderReservationSummary(orderId);
  }

  async calculateReservationValue(
    reservations: InventoryReservationType[]
  ): Promise<string> {
    return this.reservationAnalyticsService.calculateReservationValue(reservations);
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
    return this.reservationAnalyticsService.optimizeReservations(assignmentId);
  }

  // Utility operations (delegated to ReservationUtils)
  async fulfillReservations(orderId: number): Promise<void> {
    return ReservationUtils.fulfillReservations(orderId);
  }

  async cancelReservations(orderId: number): Promise<void> {
    return ReservationUtils.cancelReservations(orderId);
  }

  async expireOldReservations(thresholdHours?: number): Promise<number> {
    return ReservationUtils.expireOldReservations(thresholdHours);
  }

  async restoreExpiredReservations(orderId: number): Promise<void> {
    return ReservationUtils.restoreExpiredReservations(orderId);
  }

  async cancelReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void> {
    return ReservationUtils.cancelReservationsWithTransaction(trx, orderId);
  }

  async fulfillReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void> {
    return ReservationUtils.fulfillReservationsWithTransaction(trx, orderId);
  }

  async extendReservationExpiry(
    reservationId: number,
    newExpiryDate: Date
  ): Promise<InventoryReservationType> {
    return ReservationUtils.extendReservationExpiry(reservationId, newExpiryDate);
  }

  async setReservationExpiry(orderId: number, expiresAt: Date): Promise<void> {
    return ReservationUtils.setReservationExpiry(orderId, expiresAt);
  }

  async bulkCancelReservations(orderIds: number[]): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }> {
    return ReservationUtils.bulkCancelReservations(orderIds);
  }

  async restoreReservedInventory(orderId: number): Promise<void> {
    await this.cancelReservations(orderId);
  }
}