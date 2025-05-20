import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
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
 *           description: Only included when 'users' relation is requested
 *           items:
 *             type: object
 *             properties:
 *               assignmentId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               storeId:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
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
 *                       entryDate:
 *                         type: string
 *                         format: date
 *               currentInventory:
 *                 type: object
 *                 description: Current day's inventory status. Only included when 'inventory' relation is requested
 *                 properties:
 *                   inventoryId:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [created, assigned, validated]
 *                   assignmentDate:
 *                     type: string
 *                     format: date
 *                   assignedByUser:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: integer
 *                       name:
 *                         type: string
 */
export interface StoreBasic extends Store {}

export interface StoreWithUsers extends StoreBasic {
  assignedUsers: StoreAssignment[];
}

export interface StoreWithInventory extends StoreWithUsers {
  assignedUsers: (StoreAssignment & {
    // Single current inventory assignment, not an array
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
  users?: boolean;
  inventory?: boolean; // Simplified - just include current inventory or not
}
