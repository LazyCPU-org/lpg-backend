import { ItemTypeEnum } from "../../../db/schemas/orders";
import type { AvailabilityCheckItem, AvailabilityResult } from "./IInventoryReservationRepository";

export abstract class IReservationAvailabilityService {
  // Availability checking operations
  abstract checkAvailability(
    storeId: number,
    items: AvailabilityCheckItem[]
  ): Promise<AvailabilityResult>;

  abstract getAvailableQuantity(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number
  ): Promise<number>;

  abstract getCurrentInventoryStatus(storeId: number): Promise<{
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
  }>;

  abstract canReserveQuantity(
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
  }>;

  abstract getCurrentStoreAssignment(storeId: number): Promise<{
    assignmentId: number;
    currentInventoryId: number;
    status: string;
  } | null>;
}