import type { OrderItemRequest } from "./IInventoryReservationRepository";

export abstract class IReservationValidationService {
  // Validation operations
  abstract validateReservationRequest(
    storeId: number,
    items: OrderItemRequest[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  abstract validateReservationLimits(
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
  }>;
}