import type { CheckAvailabilityRequest } from "../../../dtos/request/orderDTO";
import type {
  AvailabilityResult,
  FulfillmentResult,
  InventoryReservationType,
  ReservationResult,
  RestoreResult,
} from "../../../dtos/response/orderInterface";

/**
 * Inventory Reservation Service Interface
 *
 * Manages business logic for inventory reservations
 * following simple parameter patterns from inventory services.
 */
export abstract class IInventoryReservationService {
  // Test-aligned methods (primary interface)
  abstract checkAvailability(
    request: CheckAvailabilityRequest
  ): Promise<AvailabilityResult>;

  abstract createReservationsForOrder(
    orderId: number
  ): Promise<ReservationResult>;

  abstract fulfillReservations(
    orderId: number,
    userId: number
  ): Promise<FulfillmentResult>;

  abstract restoreReservations(
    orderId: number,
    reason: string
  ): Promise<RestoreResult>;

  abstract getActiveReservations(
    orderId: number
  ): Promise<InventoryReservationType[]>;

  abstract calculateAvailableQuantity(
    storeId: number,
    itemType: string,
    itemId: number
  ): Promise<number>;

  // Core Reservation Management
  abstract createReservation(
    orderId: number,
    storeId: number,
    items: Array<{
      itemType: "tank" | "item";
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
  }>;

  abstract modifyReservation(
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
  }>;

  abstract cancelReservation(
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
  }>;

  // Legacy availability checking (kept for backward compatibility)
  abstract checkAvailabilityLegacy(
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
  }>;

  // Reservation Fulfillment
  abstract fulfillReservation(
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
  }>;

  // Restoration
  abstract restoreReservation(
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
  }>;

  // Analytics
  abstract getReservationMetrics(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    totalReservations: number;
    activeReservations: number;
    expiredReservations: number;
    fulfillmentRate: number;
  }>;
}
