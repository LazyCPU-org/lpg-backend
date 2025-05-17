import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { storeAssignments, stores } from "../../db/schemas/locations";

// Create Zod schemas for validation
export const InsertStoreSchema = createInsertSchema(stores);
const SelectStoreSchema = createSelectSchema(stores);

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
export type Store = z.infer<typeof SelectStoreSchema>;
export type NewStore = z.infer<typeof InsertStoreSchema>;

export const InsertStoreAssignmentSchema = createInsertSchema(storeAssignments);
const SelectStoreAssignmentSchema = createSelectSchema(storeAssignments);

export type StoreAssignment = z.infer<typeof SelectStoreAssignmentSchema>;
export type NewStoreAssignment = z.infer<typeof InsertStoreAssignmentSchema>;
