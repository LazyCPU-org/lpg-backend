import { ItemTypeEnum } from "../../../db/schemas/orders";
import type { OrderItemRequest } from "./IInventoryReservationRepository";
import { IReservationAvailabilityService } from "./IReservationAvailabilityService";
import { IReservationValidationService } from "./IReservationValidationService";

export class ReservationValidationService implements IReservationValidationService {
  constructor(private availabilityService: IReservationAvailabilityService) {}

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
    const currentAssignment = await this.availabilityService.getCurrentStoreAssignment(storeId);
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
      const availableQuantity = await this.availabilityService.getAvailableQuantity(
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
}