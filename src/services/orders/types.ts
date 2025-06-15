/**
 * Order Services Common Types
 *
 * This file contains shared types and interfaces used across the order services
 * to ensure consistency and avoid type mismatches.
 */

import type { OrderStatusEnum } from "../../db/schemas/orders/order-status-types";
import type {
  InventoryReservationType,
  OrderWithDetails,
} from "../../dtos/response/orderInterface";

// Item type for consistency across services
export type ItemType = "tank" | "item";

// Order item structure for service operations
export interface ServiceOrderItem {
  itemType: ItemType;
  itemId: number; // tankTypeId or inventoryItemId
  quantity: number;
  unitPrice?: string;
}

// Simplified availability check item
export interface ServiceAvailabilityItem {
  itemType: ItemType;
  itemId: number;
  quantity: number;
}

// Service-level availability result
export interface ServiceAvailabilityResult {
  available: boolean;
  items: Array<{
    itemType: string;
    itemId: number;
    requestedQuantity: number;
    availableQuantity: number;
    canFulfill: boolean;
  }>;
}

// Reservation operation results
export interface ServiceReservationResult {
  successful: boolean;
  reservations: InventoryReservationType[];
  errors: string[];
}

// Restoration result
export interface ServiceRestoreResult {
  restored: boolean;
  restoredQuantities: Array<{
    itemType: string;
    itemId: number;
    quantityRestored: number;
  }>;
  errors: string[];
}

// Fulfillment result
export interface ServiceFulfillmentResult {
  fulfilled: boolean;
  transactionIds: number[];
  discrepancies: Array<{
    itemType: string;
    itemId: number;
    reserved: number;
    delivered: number;
  }>;
}

// Order transition result
export interface ServiceOrderTransition {
  order: OrderWithDetails;
  fromStatus: OrderStatusEnum;
  toStatus: OrderStatusEnum;
  historyEntry: any; // Will be typed properly when history interface is available
}

// Quick order result
export interface ServiceQuickOrderResult {
  order: OrderWithDetails;
  customerCreated: boolean;
  warnings: string[];
}

// Order metrics
export interface ServiceOrderMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: string;
  totalRevenue: string;
}

// Workflow metrics
export interface ServiceWorkflowMetrics {
  totalOrders: number;
  averageProcessingTime: number;
  deliverySuccessRate: number;
  cancellationRate: number;
}

// Reservation metrics
export interface ServiceReservationMetrics {
  totalReservations: number;
  activeReservations: number;
  expiredReservations: number;
  fulfillmentRate: number;
}

// Transition validation result
export interface ServiceTransitionValidation {
  canTransition: boolean;
  reason?: string;
}

// Available transitions
export interface ServiceAvailableTransition {
  toStatus: OrderStatusEnum;
  description: string;
  requiresConfirmation: boolean;
}

// Bulk operation results
export interface ServiceBulkResult {
  successful: number[];
  failed: Array<{
    orderId: number;
    error: string;
  }>;
}

// Create order total calculation
export interface ServiceOrderCalculation {
  subtotal: string;
  tax: string;
  total: string;
}

// Delivered item for fulfillment
export interface ServiceDeliveredItem {
  itemType: ItemType;
  itemId: number;
  deliveredQuantity: number;
}
