export { IInventoryAssignmentRepository } from "./IInventoryAssignmentRepository";
export { IItemAssignmentRepository } from "./IItemAssignmentRepository";
export { ITankAssignmentRepository } from "./ITankAssignmentRepository";
export { PgInventoryAssignmentRepository } from "./PgInventoryAssignmentRepository";
export { PgItemAssignmentRepository } from "./PgItemAssignmentRepository";
export { PgTankAssignmentRepository } from "./PgTankAssignmentRepository";

// Transaction service exports
export { IInventoryTransactionRepository } from "./IInventoryTransactionRepository";
export { PgInventoryTransactionRepository } from "./PgInventoryTransactionRepository";
export {
  BUSINESS_OPERATIONS,
  TRANSACTION_DESCRIPTIONS,
  TRANSACTION_TYPES,
  TransactionTypeEnum,
} from "./transactionTypes";
export type { TransactionType } from "./transactionTypes";

// Consolidation workflow exports
export {
  ConsolidationWorkflow,
  IConsolidationWorkflow,
} from "./consolidationWorkflow";

// Export reservation repository classes
export { IInventoryReservationRepository, PgInventoryReservationRepository } from "./reservations";

// Export reservation types - these are type-only exports
export type {
  AvailabilityCheckItem,
  AvailabilityResult,
  OrderItemRequest,
  OrderReservationSummary,
  ReservationMetrics,
} from "./reservations";

// Future inventory repositories can be added here:
// export { ITankTypeRepository } from './ITankTypeRepository';
// export { PgTankTypeRepository } from './PgTankTypeRepository';
// export { IInventoryItemRepository } from './IInventoryItemRepository';
// export { PgInventoryItemRepository } from './PgInventoryItemRepository';
