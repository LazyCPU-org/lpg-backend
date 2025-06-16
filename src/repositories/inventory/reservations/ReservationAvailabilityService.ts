import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { assignmentItems } from "../../../db/schemas/inventory/inventory-assignments-items";
import { assignmentTanks } from "../../../db/schemas/inventory/inventory-assignments-tanks";
import { storeAssignmentCurrentInventory } from "../../../db/schemas/locations/store-assignment-current-inventory";
import { storeAssignments } from "../../../db/schemas/locations/store-assignments";
import { ItemTypeEnum } from "../../../db/schemas/orders";
import { NotFoundError } from "../../../utils/custom-errors";
import type { 
  AvailabilityCheckItem, 
  AvailabilityResult 
} from "./IInventoryReservationRepository";
import { IReservationAvailabilityService } from "./IReservationAvailabilityService";
import { IReservationQueryService } from "./IReservationQueryService";

export class ReservationAvailabilityService implements IReservationAvailabilityService {
  constructor(private reservationQueryService: IReservationQueryService) {}

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
        const reservedQuantity = await this.reservationQueryService.getReservedQuantityByItem(
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
        const reservedQuantity = await this.reservationQueryService.getReservedQuantityByItem(
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

  // Helper method for quantity breakdown
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

    const reservedQuantity = await this.reservationQueryService.getReservedQuantityByItem(
      assignmentId,
      itemType,
      itemId
    );

    return { currentQuantity, reservedQuantity };
  }
}