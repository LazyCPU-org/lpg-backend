import { ItemTypeEnum, ReservationStatusEnum } from "../../db/schemas/orders";
import type {
  InventoryReservationType,
  InventoryReservationWithDetails,
} from "../../dtos/response/orderInterface";

// Transaction type for dependency injection (following inventory pattern)
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

// Availability check interfaces
export interface AvailabilityCheckItem {
  itemType: "tank" | "item";
  itemId: number; // tankTypeId or inventoryItemId
  requiredQuantity: number;
}

export interface AvailabilityResult {
  available: boolean;
  items: Array<{
    itemType: "tank" | "item";
    itemId: number;
    requiredQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    currentQuantity: number;
    sufficient: boolean;
  }>;
  message?: string; // Descriptive message for UX
}

// Order item request for reservation
export interface OrderItemRequest {
  itemType: "tank" | "item";
  itemId: number; // tankTypeId or inventoryItemId
  quantity: number;
  unitPrice?: string; // Optional for cost calculation
}

// Reservation metrics interface
export interface ReservationMetrics {
  totalActiveReservations: number;
  totalReservedValue: string; // Monetary value of reserved inventory
  reservationsByStatus: Record<string, number>;
  expiringSoon: number; // Count of reservations expiring within threshold
  averageReservationDuration: number; // Hours
  topReservedItems: Array<{
    itemType: string;
    itemId: number;
    itemName: string;
    totalReserved: number;
    totalValue: string;
  }>;
}

// Reservation summary for orders
export interface OrderReservationSummary {
  orderId: number;
  totalReservations: number;
  reservationStatus: "complete" | "partial" | "failed";
  items: Array<{
    itemType: string;
    itemId: number;
    requestedQuantity: number;
    reservedQuantity: number;
    status: string;
  }>;
  totalValue: string;
  expiresAt?: Date;
}

export abstract class IInventoryReservationRepository {
  // Core Reservation Operations
  abstract createReservation(
    orderId: number,
    assignmentId: number,
    currentInventoryId: number,
    itemType: ItemTypeEnum,
    tankTypeId: number | null,
    inventoryItemId: number | null,
    quantity: number,
    expiresAt?: Date
  ): Promise<InventoryReservationType>;

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

  // Reservation Status Management
  abstract updateReservationStatus(
    reservationId: number,
    status: ReservationStatusEnum
  ): Promise<InventoryReservationType>;

  abstract fulfillReservations(orderId: number): Promise<void>;

  abstract cancelReservations(orderId: number): Promise<void>;

  abstract expireOldReservations(thresholdHours?: number): Promise<number>;

  abstract restoreExpiredReservations(orderId: number): Promise<void>;

  // Availability Checking (Critical for UX)
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

  // Transaction Support (for atomic operations)
  abstract createReservationWithTransaction(
    trx: DbTransaction,
    orderId: number,
    assignmentId: number,
    currentInventoryId: number,
    itemType: ItemTypeEnum,
    tankTypeId: number | null,
    inventoryItemId: number | null,
    quantity: number,
    expiresAt?: Date
  ): Promise<InventoryReservationType>;

  abstract cancelReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void>;

  abstract fulfillReservationsWithTransaction(
    trx: DbTransaction,
    orderId: number
  ): Promise<void>;

  abstract updateReservationStatusWithTransaction(
    trx: DbTransaction,
    reservationId: number,
    status: ReservationStatusEnum
  ): Promise<InventoryReservationType>;

  // Integration with Inventory System
  abstract reserveInventoryItems(
    orderId: number,
    storeId: number,
    items: OrderItemRequest[],
    expiresAt?: Date
  ): Promise<InventoryReservationType[]>;

  abstract restoreReservedInventory(orderId: number): Promise<void>;

  abstract validateReservationRequest(
    storeId: number,
    items: OrderItemRequest[]
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  // Batch Operations
  abstract bulkReserveItems(
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
  }>;

  abstract bulkCancelReservations(orderIds: number[]): Promise<{
    successful: number[];
    failed: Array<{ orderId: number; error: string }>;
  }>;

  // Expiration Management
  abstract findExpiringReservations(
    thresholdHours?: number
  ): Promise<InventoryReservationType[]>;

  abstract extendReservationExpiry(
    reservationId: number,
    newExpiryDate: Date
  ): Promise<InventoryReservationType>;

  abstract setReservationExpiry(
    orderId: number,
    expiresAt: Date
  ): Promise<void>;

  // Analytics and Reporting
  abstract getReservationMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<ReservationMetrics>;

  abstract getOrderReservationSummary(
    orderId: number
  ): Promise<OrderReservationSummary>;

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
      duration?: number; // Minutes
    }>
  >;

  // Utility and Helper Methods
  abstract calculateReservationValue(
    reservations: InventoryReservationType[]
  ): Promise<string>;

  abstract findConflictingReservations(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<InventoryReservationType[]>;

  abstract optimizeReservations(assignmentId: number): Promise<{
    optimized: number;
    conflicts: Array<{
      itemType: string;
      itemId: number;
      totalReserved: number;
      available: number;
      shortage: number;
    }>;
  }>;

  // Store Integration Helpers
  abstract getCurrentStoreAssignment(storeId: number): Promise<{
    assignmentId: number;
    currentInventoryId: number;
    status: string;
  } | null>;

  abstract getReservedQuantityByItem(
    assignmentId: number,
    itemType: ItemTypeEnum,
    itemId: number,
    excludeOrderId?: number
  ): Promise<number>;

  abstract getActiveReservationsByStore(
    storeId: number
  ): Promise<InventoryReservationType[]>;

  // Validation and Business Rules
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
