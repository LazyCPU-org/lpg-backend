// storeInterface.ts - UPDATED with proper type matching

import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { inventoryItem, tankType } from "../../db/schemas";
import { storeAssignments, stores } from "../../db/schemas/locations";

/**
 * @openapi
 * components:
 *   schemas:
 *     Store:
 *       type: object
 *       properties:
 *         storeId:
 *           type: integer
 *           description: The auto-generated id of the store
 *         name:
 *           type: string
 *           description: The name of the store
 *         address:
 *           type: string
 *           description: Physical address of the store
 *         latitude:
 *           type: string
 *           description: Geographic latitude of the store
 *         longitude:
 *           type: string
 *           description: Geographic longitude of the store
 *         phoneNumber:
 *           type: string
 *           description: Contact phone number for the store
 *         mapsUrl:
 *           type: string
 *           description: Google Maps URL for the store location
 *       required:
 *         - storeId
 *         - name
 *         - address
 *     StoreAssignment:
 *       type: object
 *       properties:
 *         assignmentId:
 *           type: integer
 *           description: The ID of the assignment
 *         storeId:
 *           type: integer
 *           description: The store ID
 *         userId:
 *           type: integer
 *           description: The user ID
 *         startDate:
 *           type: string
 *           format: date
 *           description: When the user assignment started
 *         endDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: When the user assignment ended (null if active)
 *     StoreCatalogTank:
 *       type: object
 *       properties:
 *         storeInventoryTankId:
 *           type: integer
 *         tankTypeId:
 *           type: integer
 *         defaultPurchasePrice:
 *           type: string
 *           description: Default purchase price for this tank type
 *         defaultSellPrice:
 *           type: string
 *           description: Default selling price for this tank type
 *         isActive:
 *           type: boolean
 *           description: Whether this tank type is currently available for sale
 *         defaultFullTanks:
 *           type: integer
 *           description: Default quantity of full tanks to assign daily
 *         defaultEmptyTanks:
 *           type: integer
 *           description: Default quantity of empty tanks to assign daily
 *         tankType:
 *           type: object
 *           properties:
 *             typeId:
 *               type: integer
 *             name:
 *               type: string
 *             weight:
 *               type: string
 *             description:
 *               type: string
 *             scale:
 *               type: string
 *     StoreCatalogItem:
 *       type: object
 *       properties:
 *         storeInventoryItemId:
 *           type: integer
 *         inventoryItemId:
 *           type: integer
 *         defaultPurchasePrice:
 *           type: string
 *           description: Default purchase price for this item
 *         defaultSellPrice:
 *           type: string
 *           description: Default selling price for this item
 *         isActive:
 *           type: boolean
 *           description: Whether this item is currently available for sale
 *         defaultQuantity:
 *           type: integer
 *           description: Default quantity to assign daily
 *         inventoryItem:
 *           type: object
 *           properties:
 *             inventoryItemId:
 *               type: integer
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             scale:
 *               type: string
 */
export const InsertStoreSchema = createInsertSchema(stores);
const SelectStoreSchema = createSelectSchema(stores);

// Store Schema
export type Store = z.infer<typeof SelectStoreSchema>;
export type NewStore = z.infer<typeof InsertStoreSchema>;

export const InsertStoreAssignmentSchema = createInsertSchema(storeAssignments);
const SelectStoreAssignmentSchema = createSelectSchema(storeAssignments);

export type StoreAssignment = z.infer<typeof SelectStoreAssignmentSchema>;
export type NewStoreAssignment = z.infer<typeof InsertStoreAssignmentSchema>;

// Full database types (used for operations that need complete records)
const selectTankTypeSchema = createSelectSchema(tankType);
export type TankType = z.infer<typeof selectTankTypeSchema>;

export const selectInventoryItemSchema = createSelectSchema(inventoryItem);
export type InventoryItem = z.infer<typeof selectInventoryItemSchema>;

// Catalog-specific types (matching exactly what the repository returns)
// These are lightweight versions that only include fields needed for the catalog display
export interface CatalogTankType {
  typeId: number;
  name: string;
  weight: string;
  description: string | null;
  scale: string;
}

export interface CatalogInventoryItem {
  inventoryItemId: number;
  name: string;
  description: string | null;
  scale: string;
}

// Store Catalog Types
export interface StoreCatalogTank {
  storeCatalogTankId: number;
  tankTypeId: number;
  defaultPurchasePrice: string;
  defaultSellPrice: string;
  isActive: boolean | null;
  defaultFullTanks: number | null;
  defaultEmptyTanks: number | null;
  tankType: CatalogTankType | null;
}

export interface StoreCatalogItem {
  storeCatalogItemId: number;
  inventoryItemId: number;
  defaultPurchasePrice: string;
  defaultSellPrice: string;
  isActive: boolean | null;
  defaultQuantity: number | null;
  inventoryItem: CatalogInventoryItem | null;
}

export interface StoreCatalog {
  tanks: StoreCatalogTank[];
  items: StoreCatalogItem[];
}

// Refined interfaces for store relations
/**
 * @openapi
 * components:
 *   schemas:
 *     StoreResponse:
 *       type: object
 *       properties:
 *         storeId:
 *           type: integer
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         latitude:
 *           type: string
 *         longitude:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         mapsUrl:
 *           type: string
 *         assignedUsers:
 *           type: array
 *           description: Only included when 'assignments' relation is requested
 *           items:
 *             $ref: '#/components/schemas/StoreAssignment'
 *         catalog:
 *           type: object
 *           description: Only included when 'catalog' relation is requested
 *           properties:
 *             tanks:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoreCatalogTank'
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoreCatalogItem'
 *         currentInventory:
 *           type: array
 *           description: Current day's inventory assignments. Only included when 'inventory' relation is requested
 *           items:
 *             type: object
 *             properties:
 *               assignmentId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               user:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: integer
 *                   userProfile:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *               currentInventory:
 *                 type: object
 *                 properties:
 *                   inventoryId:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [created, assigned, validated]
 *                   assignmentDate:
 *                     type: string
 *                     format: date
 */
export interface StoreBasic extends Store {}

export interface StoreWithAssignments extends StoreBasic {
  assignedUsers: StoreAssignment[];
}

export interface StoreWithCatalog extends StoreBasic {
  catalog: StoreCatalog;
}

export interface StoreWithInventory extends StoreBasic {
  currentInventory: (StoreAssignment & {
    user: {
      userId: number;
      userProfile: {
        firstName: string;
        lastName: string;
        entryDate: string;
      };
    };
    currentInventory?: {
      inventoryId: number;
      status: string;
      assignmentDate: string;
      assignedBy: number;
      notes?: string;
    };
  })[];
}

// Full response type with all possible relations
export interface StoreWithAllRelations extends StoreBasic {
  assignedUsers?: StoreAssignment[];
  catalog?: StoreCatalog;
  currentInventory?: (StoreAssignment & {
    user: {
      userId: number;
      userProfile: {
        firstName: string;
        lastName: string;
        entryDate: string;
      };
    };
    currentInventory?: {
      inventoryId: number;
      status: string;
      assignmentDate: string;
      assignedBy: number;
      notes?: string;
    };
  })[];
}

export interface StoreRelationOptions {
  assignments?: boolean; // Renamed from 'users' for clarity
  catalog?: boolean; // NEW: Include store's product catalog
  inventory?: boolean; // Include current day's inventory assignments
}

// Union type for repository return
export type StoreWithRelations =
  | StoreBasic
  | StoreWithAssignments
  | StoreWithCatalog
  | StoreWithInventory
  | StoreWithAllRelations;
