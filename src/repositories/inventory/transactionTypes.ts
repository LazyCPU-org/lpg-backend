// src/repositories/inventory/transactionTypes.ts - Updated to match existing schema
import { TransactionTypeEnum } from "../../db/schemas/inventory/item-transactions";

// Export your existing enum values
export { TransactionTypeEnum } from "../../db/schemas/inventory/item-transactions";

// Extended transaction types that map to your existing ones
export const TRANSACTION_TYPES = {
  // Your existing types
  PURCHASE: TransactionTypeEnum.PURCHASE, // "purchase"
  SALE: TransactionTypeEnum.SALE, // "sale"
  RETURN: TransactionTypeEnum.RETURN, // "return"
  TRANSFER: TransactionTypeEnum.TRANSFER, // "transfer"
  ASSIGNMENT: TransactionTypeEnum.ASSIGNMENT, // "assignment"

  // Aliases for common business operations (maps to existing types)
  DELIVERY_OUT: TransactionTypeEnum.SALE, // Customer delivery = sale
  DELIVERY_RETURN: TransactionTypeEnum.RETURN, // Customer return = return
  CUSTOMER_PICKUP: TransactionTypeEnum.SALE, // Customer pickup = sale
  CUSTOMER_RETURN: TransactionTypeEnum.RETURN, // Customer return = return
  INITIAL_ASSIGNMENT: TransactionTypeEnum.ASSIGNMENT, // Initial setup = assignment
  CATALOG_POPULATION: TransactionTypeEnum.ASSIGNMENT, // Catalog setup = assignment
  STOCK_ADJUSTMENT: TransactionTypeEnum.PURCHASE, // Stock adjustment = purchase
  START_OF_DAY: TransactionTypeEnum.ASSIGNMENT, // Day start = assignment
  END_OF_DAY: TransactionTypeEnum.TRANSFER, // Day end = transfer
  ADMIN_CORRECTION: TransactionTypeEnum.PURCHASE, // Admin fix = purchase
} as const;

export type TransactionType =
  (typeof TransactionTypeEnum)[keyof typeof TransactionTypeEnum];

// Helper descriptions for each transaction type
export const TRANSACTION_DESCRIPTIONS = {
  [TransactionTypeEnum.PURCHASE]: "Compra de proveedor para reponer inventario",
  [TransactionTypeEnum.SALE]: "Venta realizada a cliente",
  [TransactionTypeEnum.RETURN]: "Artículo devuelto (usado para tanques)",
  [TransactionTypeEnum.TRANSFER]: "Transferencia a otro inventario",
  [TransactionTypeEnum.ASSIGNMENT]: "Asignación inicial de superior",
} as const;

// Business operation helpers
export const BUSINESS_OPERATIONS = {
  deliveryOut: {
    type: TRANSACTION_TYPES.DELIVERY_OUT,
    description: "Entrega realizada a cliente",
  },
  deliveryReturn: {
    type: TRANSACTION_TYPES.DELIVERY_RETURN,
    description: "Devolución de cliente",
  },
  customerPickup: {
    type: TRANSACTION_TYPES.CUSTOMER_PICKUP,
    description: "Cliente recogió artículos",
  },
  customerReturn: {
    type: TRANSACTION_TYPES.CUSTOMER_RETURN,
    description: "Cliente devolvió artículos",
  },
  initialAssignment: {
    type: TRANSACTION_TYPES.INITIAL_ASSIGNMENT,
    description: "Asignación inicial de catálogo",
  },
  stockAdjustment: {
    type: TRANSACTION_TYPES.STOCK_ADJUSTMENT,
    description: "Ajuste de inventario",
  },
  startOfDay: {
    type: TRANSACTION_TYPES.START_OF_DAY,
    description: "Inicio de jornada laboral",
  },
  endOfDay: {
    type: TRANSACTION_TYPES.END_OF_DAY,
    description: "Fin de jornada laboral",
  },
  adminCorrection: {
    type: TRANSACTION_TYPES.ADMIN_CORRECTION,
    description: "Corrección administrativa",
  },
} as const;
