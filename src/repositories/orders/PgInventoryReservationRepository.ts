import { and, asc, count, desc, eq, gte, lt, lte, sql, sum } from "drizzle-orm";
import { db } from "../../db";
import { assignmentItems } from "../../db/schemas/inventory/inventory-assignments-items";
import { assignmentTanks } from "../../db/schemas/inventory/inventory-assignments-tanks";
import { storeAssignmentCurrentInventory } from "../../db/schemas/locations/store-assignment-current-inventory";
import { storeAssignments } from "../../db/schemas/locations/store-assignments";
import { ItemTypeEnum } from "../../db/schemas/orders";
import {
  inventoryReservations,
  ReservationStatusEnum,
} from "../../db/schemas/orders/inventory-reservations";
import {
  InventoryReservationType,
  InventoryReservationWithDetails,
} from "../../dtos/response/orderInterface";
import {
  BadRequestError,
  ConflictError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import {
  AvailabilityCheckItem,
  AvailabilityResult,
  IInventoryReservationRepository,
  OrderItemRequest,
  OrderReservationSummary,
  ReservationMetrics,
} from "./IInventoryReservationRepository";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgInventoryReservationRepository
  implements IInventoryReservationRepository
{
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

  async fulfillReservations(orderId: number): Promise<void> {
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

  async cancelReservations(orderId: number): Promise<void> {
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

  async expireOldReservations(thresholdHours: number = 24): Promise<number> {
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

  async restoreExpiredReservations(orderId: number): Promise<void> {
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

  async checkAvailability(
    storeId: number,
    items: AvailabilityCheckItem[]
  ): Promise<AvailabilityResult> {
    // Get current store assignment
    const currentAssignment = await this.getCurrentStoreAssignment(storeId);

    if (!currentAssignment) {
      return {
        available: false,
        items: [],
        message: "No active store assignment found",
      };
    }

    const itemResults = [];
    let allAvailable = true;

    for (const item of items) {
      const availableQuantity = await this.getAvailableQuantity(
        currentAssignment.assignmentId,
        item.itemType as ItemTypeEnum,
        item.itemId
      );

      // Get current and reserved quantities for detailed reporting
      const { currentQuantity, reservedQuantity } =
        await this.getQuantityBreakdown(
          currentAssignment.currentInventoryId,
          currentAssignment.assignmentId,
          item.itemType as ItemTypeEnum,
          item.itemId
        );

      const sufficient = availableQuantity >= item.requiredQuantity;
      if (!sufficient) {
        allAvailable = false;
      }

      itemResults.push({
        itemType: item.itemType,
        itemId: item.itemId,
        requiredQuantity: item.requiredQuantity,
        availableQuantity,
        reservedQuantity,
        currentQuantity,
        sufficient,
      });
    }

    return {
      available: allAvailable,
      items: itemResults,
      message: allAvailable
        ? "All items are available"
        : "Some items have insufficient availability",
    };
  }

  async getAvailableQuantity(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number
  ): Promise<number> {
    // Get current assignment to find inventory ID
    const currentAssignment =
      await db.query.storeAssignmentCurrentInventory.findFirst({
        where: eq(storeAssignmentCurrentInventory.assignmentId, assignmentId),
      });

    if (!currentAssignment) {
      return 0;
    }

    const { currentQuantity, reservedQuantity } =
      await this.getQuantityBreakdown(
        currentAssignment.currentInventoryId,
        assignmentId,
        itemType,
        itemId
      );

    return Math.max(0, currentQuantity - reservedQuantity);
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
    const currentAssignment = await this.getCurrentStoreAssignment(storeId);

    if (!currentAssignment) {
      throw new NotFoundError("No active store assignment found");
    }

    // Get tank inventory status
    const tankInventory = await db
      .select({
        tankTypeId: assignmentTanks.tankTypeId,
        currentFullTanks: assignmentTanks.currentFullTanks,
        currentEmptyTanks: assignmentTanks.currentEmptyTanks,
      })
      .from(assignmentTanks)
      .where(
        eq(assignmentTanks.inventoryId, currentAssignment.currentInventoryId)
      );

    // Get item inventory status
    const itemInventory = await db
      .select({
        inventoryItemId: assignmentItems.inventoryItemId,
        currentQuantity: assignmentItems.currentItems,
      })
      .from(assignmentItems)
      .where(
        eq(assignmentItems.inventoryId, currentAssignment.currentInventoryId)
      );

    // Calculate reserved quantities and build response
    const tanks = await Promise.all(
      tankInventory.map(async (tank) => {
        const reservedQuantity = await this.getReservedQuantityByItem(
          currentAssignment.assignmentId,
          ItemTypeEnum.TANK,
          tank.tankTypeId
        );
        const currentQuantity =
          (tank.currentFullTanks || 0) + (tank.currentEmptyTanks || 0);

        return {
          tankTypeId: tank.tankTypeId,
          currentQuantity,
          reservedQuantity,
          availableQuantity: Math.max(0, currentQuantity - reservedQuantity),
        };
      })
    );

    const items = await Promise.all(
      itemInventory.map(async (item) => {
        const reservedQuantity = await this.getReservedQuantityByItem(
          currentAssignment.assignmentId,
          ItemTypeEnum.ITEM,
          item.inventoryItemId
        );
        const currentQuantity = item.currentQuantity || 0;

        return {
          inventoryItemId: item.inventoryItemId,
          currentQuantity,
          reservedQuantity,
          availableQuantity: Math.max(0, currentQuantity - reservedQuantity),
        };
      })
    );

    return {
      assignmentId: currentAssignment.assignmentId,
      tanks,
      items,
    };
  }

  // Transaction-aware operations
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

  async cancelReservationsWithTransaction(
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

  async fulfillReservationsWithTransaction(
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

  async restoreReservedInventory(orderId: number): Promise<void> {
    await this.cancelReservations(orderId);
  }

  async validateReservationRequest(
    storeId: number,
    items: OrderItemRequest[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if store has active assignment
    const currentAssignment = await this.getCurrentStoreAssignment(storeId);
    if (!currentAssignment) {
      errors.push("No active store assignment found");
      return { valid: false, errors, warnings };
    }

    // Validate each item
    for (const item of items) {
      if (item.quantity <= 0) {
        errors.push(
          `Invalid quantity for ${item.itemType} ID ${item.itemId}: must be positive`
        );
        continue;
      }

      // Check if item exists and availability
      const availableQuantity = await this.getAvailableQuantity(
        currentAssignment.assignmentId,
        item.itemType as ItemTypeEnum,
        item.itemId
      );

      if (availableQuantity === 0) {
        errors.push(`${item.itemType} ID ${item.itemId} is not available`);
      } else if (availableQuantity < item.quantity) {
        errors.push(
          `Insufficient ${item.itemType} ID ${item.itemId}: need ${item.quantity}, available ${availableQuantity}`
        );
      } else if (availableQuantity === item.quantity) {
        warnings.push(
          `Reserving all available ${item.itemType} ID ${item.itemId}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Helper methods
  private async getQuantityBreakdown(
    inventoryId: number,
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number
  ): Promise<{ currentQuantity: number; reservedQuantity: number }> {
    let currentQuantity = 0;

    if (itemType === ItemTypeEnum.TANK) {
      const tankInventory = await db
        .select({
          fullTanks: assignmentTanks.currentFullTanks,
          emptyTanks: assignmentTanks.currentEmptyTanks,
        })
        .from(assignmentTanks)
        .where(
          and(
            eq(assignmentTanks.inventoryId, inventoryId),
            eq(assignmentTanks.tankTypeId, itemId)
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
            eq(assignmentItems.inventoryId, inventoryId),
            eq(assignmentItems.inventoryItemId, itemId)
          )
        )
        .limit(1);

      if (itemInventory.length > 0) {
        currentQuantity = itemInventory[0].quantity || 0;
      }
    }

    const reservedQuantity = await this.getReservedQuantityByItem(
      assignmentId,
      itemType,
      itemId
    );

    return { currentQuantity, reservedQuantity };
  }

  async getCurrentStoreAssignment(storeId: number): Promise<{
    assignmentId: number;
    currentInventoryId: number;
    status: string;
  } | null> {
    // First find the store assignment for this store
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
      status: "active", // Simplified - would need to get actual status from inventory assignment
    };
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
        totalReserved: sum(inventoryReservations.reservedQuantity),
      })
      .from(inventoryReservations)
      .where(and(...whereConditions));

    return parseInt(result[0]?.totalReserved || "0");
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
    // Get current assignment to find inventory ID
    const currentAssignment =
      await db.query.storeAssignmentCurrentInventory.findFirst({
        where: eq(storeAssignmentCurrentInventory.assignmentId, assignmentId),
      });

    if (!currentAssignment) {
      return {
        canReserve: false,
        availableQuantity: 0,
        currentQuantity: 0,
        reservedQuantity: 0,
        message: "No current inventory found",
      };
    }

    const { currentQuantity, reservedQuantity } =
      await this.getQuantityBreakdown(
        currentAssignment.currentInventoryId,
        assignmentId,
        itemType,
        itemId
      );

    const availableQuantity = Math.max(0, currentQuantity - reservedQuantity);
    const canReserve = availableQuantity >= quantity;

    return {
      canReserve,
      availableQuantity,
      currentQuantity,
      reservedQuantity,
      message: canReserve
        ? undefined
        : `Insufficient quantity: need ${quantity}, available ${availableQuantity}`,
    };
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
    // Simplified implementation - could add business rules for max reservation limits
    const errors: string[] = [];
    const limits = items.map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
      maxAllowed: 1000, // Default limit
      requested: item.quantity,
    }));

    // Check if any item exceeds limits
    for (const limit of limits) {
      if (limit.requested > limit.maxAllowed) {
        errors.push(
          `${limit.itemType} ID ${limit.itemId} exceeds maximum allowed quantity (${limit.maxAllowed})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      limits,
    };
  }

  // Batch Operations
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

  async bulkCancelReservations(orderIds: number[]): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }> {
    const successful: number[] = [];
    const failed: Array<{ orderId: number; error: string }> = [];

    // Process each order individually to handle failures gracefully
    for (const orderId of orderIds) {
      try {
        await this.cancelReservations(orderId);
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

  // Expiration Management
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

  async extendReservationExpiry(
    reservationId: number,
    newExpiryDate: Date
  ): Promise<InventoryReservationType> {
    const current = await this.findReservationById(reservationId);
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

  async setReservationExpiry(orderId: number, expiresAt: Date): Promise<void> {
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

  // Analytics and Reporting
  async getReservationMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<ReservationMetrics> {
    const whereConditions = [];

    if (storeId) {
      // Get assignment for the store
      const currentAssignment = await this.getCurrentStoreAssignment(storeId);
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
    const reservations = await this.findByOrderId(orderId);

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

  // Utility and Helper Methods
  async calculateReservationValue(
    reservations: InventoryReservationType[]
  ): Promise<string> {
    // Simplified implementation - would need pricing data integration
    // For now, return 0 as we don't have pricing information
    return "0.00";
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

    // Check if reserved quantity exceeds available quantity
    // First get the current assignment to find inventory ID
    const currentAssignment =
      await db.query.storeAssignmentCurrentInventory.findFirst({
        where: eq(storeAssignmentCurrentInventory.assignmentId, assignmentId),
      });

    if (!currentAssignment) {
      return [];
    }

    const { currentQuantity } = await this.getQuantityBreakdown(
      currentAssignment.currentInventoryId,
      assignmentId,
      itemType,
      itemId
    );

    const reservations = await db
      .select()
      .from(inventoryReservations)
      .where(and(...whereConditions))
      .orderBy(desc(inventoryReservations.createdAt));

    const totalReserved = reservations.reduce(
      (sum, r) => sum + r.reservedQuantity,
      0
    );

    // Return reservations that contribute to over-reservation
    if (totalReserved > currentQuantity) {
      return reservations as InventoryReservationType[];
    }

    return [];
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
    const activeReservations = await this.findActiveReservations(assignmentId);

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

      const { currentQuantity } = await this.getQuantityBreakdown(
        currentAssignment.currentInventoryId,
        assignmentId,
        group.itemType,
        group.itemId
      );

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
