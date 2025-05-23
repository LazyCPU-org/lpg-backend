import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  AssignmentStatusEnum,
  assignmentItems,
  assignmentTanks,
  inventoryAssignments,
} from "../../db/schemas/inventory";
import { InventoryItem, TankType } from "./inventoryInterface";

/**
 * @openapi
 * components:
 *  schemas:
 *    InventoryAssignment:
 *      type: object
 *      properties:
 *        inventoryId:
 *          type: integer
 *          description: The auto-generated id
 *        assignmentId:
 *          type: integer
 *          description: Reference to store-user assignment
 *        assignmentDate:
 *          type: string
 *          format: date
 *          description: Date of the inventory assignment
 *        assignedBy:
 *          type: integer
 *          description: User ID who assigned the inventory
 *        status:
 *          type: string
 *          enum: [created, assigned, validated]
 *          description: Current status of the assignment
 *        autoAssignment:
 *          type: boolean
 *          description: If the assignment was auto-created
 *        notes:
 *          type: string
 *          description: Additional notes
 *      required:
 *        - inventoryId
 *        - assignmentId
 *        - assignmentDate
 *        - assignedBy
 *        - status
 */
export const InsertInventoryAssignmentSchema =
  createInsertSchema(inventoryAssignments);
const SelectInventoryAssignmentSchema =
  createSelectSchema(inventoryAssignments);

export type InventoryAssignmentType = z.infer<
  typeof SelectInventoryAssignmentSchema
>;
export type NewInventoryAssignmentType = z.infer<
  typeof InsertInventoryAssignmentSchema
>;

const statusSchema = z.enum([
  AssignmentStatusEnum.CREATED,
  AssignmentStatusEnum.ASSIGNED,
  AssignmentStatusEnum.VALIDATED,
]);

// Infer the type from the schema
export type StatusType = z.infer<typeof statusSchema>;

/**
 * @openapi
 * components:
 *  schemas:
 *    AssignmentTank:
 *      type: object
 *      properties:
 *        assignmentTankId:
 *          type: integer
 *          description: The auto-generated id
 *        assignmentId:
 *          type: integer
 *          description: Reference to inventory assignment
 *        tankTypeId:
 *          type: integer
 *          description: Reference to tank type
 *        purchase_price:
 *          type: number
 *          format: decimal
 *          description: Purchase price of the tank
 *        sell_price:
 *          type: number
 *          format: decimal
 *          description: Sell price of the tank
 *        assignedFullTanks:
 *          type: integer
 *          description: Number of full tanks assigned
 *        currentFullTanks:
 *          type: integer
 *          description: Current number of full tanks
 *        assignedEmptyTanks:
 *          type: integer
 *          description: Number of empty tanks assigned
 *        currentEmptyTanks:
 *          type: integer
 *          description: Current number of empty tanks
 */
export const InsertAssignmentTankSchema = createInsertSchema(assignmentTanks);
const SelectAssignmentTankSchema = createSelectSchema(assignmentTanks);

export type AssignmentTankType = z.infer<typeof SelectAssignmentTankSchema>;
export type NewAssignmentTankType = z.infer<typeof InsertAssignmentTankSchema>;

/**
 * @openapi
 * components:
 *  schemas:
 *    AssignmentItem:
 *      type: object
 *      properties:
 *        assignentItemId:
 *          type: integer
 *          description: The auto-generated id
 *        assignmentId:
 *          type: integer
 *          description: Reference to inventory assignment
 *        inventoryItemId:
 *          type: integer
 *          description: Reference to inventory item
 *        purchase_price:
 *          type: number
 *          format: decimal
 *          description: Purchase price of the item
 *        sell_price:
 *          type: number
 *          format: decimal
 *          description: Sell price of the item
 *        assignedItems:
 *          type: integer
 *          description: Number of items assigned
 *        currentItems:
 *          type: integer
 *          description: Current number of items
 */
export const InsertAssignmentItemSchema = createInsertSchema(assignmentItems);
const SelectAssignmentItemSchema = createSelectSchema(assignmentItems);

export type AssignmentItemType = z.infer<typeof SelectAssignmentItemSchema>;
export type NewAssignmentItemType = z.infer<typeof InsertAssignmentItemSchema>;

/**
 *
 * @openapi
 * components:
 *   schemas:
 *     InventoryAssignmentResponse:
 *       type: object
 *       properties:
 *         inventoryId:
 *           type: integer
 *         assignmentId:
 *           type: integer
 *         assignmentDate:
 *           type: string
 *           format: date
 *         assignedBy:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [created, assigned, validated]
 *         autoAssignment:
 *           type: boolean
 *         notes:
 *           type: string
 *         storeAssignment:
 *           type: object
 *           description: Only included when user or store relations are requested
 *           properties:
 *             assignmentId:
 *               type: integer
 *             userId:
 *               type: integer
 *             storeId:
 *               type: integer
 *             startDate:
 *               type: string
 *               format: date
 *             user:
 *               type: object
 *               description: Only included when 'user' relation is requested
 *               properties:
 *                 userId:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 userProfile:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     entryDate:
 *                       type: string
 *                       format: date
 *             store:
 *               type: object
 *               description: Only included when 'store' relation is requested
 *               properties:
 *                 storeId:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                 latitude:
 *                   type: string
 *                 longitude:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 mapsUrl:
 *                   type: string
 */
export interface InventoryAssignmentWithDetails
  extends InventoryAssignmentType {
  tanks: (AssignmentTankType & { tankDetails: TankType })[];
  items: (AssignmentItemType & { itemDetails: InventoryItem })[];
}

// Relation options for inventory assignments
export interface InventoryAssignmentRelationOptions {
  user?: boolean;
  store?: boolean;
}

// Basic inventory assignment (no relations)
export interface InventoryAssignmentBasic extends InventoryAssignmentType {}

// Inventory assignment with user relation
export interface InventoryAssignmentWithUser extends InventoryAssignmentBasic {
  storeAssignment: {
    assignmentId: number;
    userId: number;
    storeId: number;
    startDate: string;
    user: {
      userId: number;
      name: string;
      userProfile?: {
        firstName: string;
        lastName: string;
        entryDate: string;
      };
    };
  };
}

// Inventory assignment with store relation
export interface InventoryAssignmentWithStore extends InventoryAssignmentBasic {
  storeAssignment: {
    assignmentId: number;
    userId: number;
    storeId: number;
    startDate: string;
    store: {
      storeId: number;
      name: string;
      address: string;
      latitude?: string;
      longitude?: string;
      phoneNumber?: string;
      mapsUrl?: string;
    };
  };
}

// Inventory assignment with both user and store relations
export interface InventoryAssignmentWithUserAndStore
  extends InventoryAssignmentBasic {
  storeAssignment: {
    assignmentId: number;
    userId: number;
    storeId: number;
    startDate: string;
    user: {
      userId: number;
      name: string;
      userProfile?: {
        firstName: string;
        lastName: string;
        entryDate: string;
      };
    };
    store: {
      storeId: number;
      name: string;
      address: string;
      latitude?: string;
      longitude?: string;
      phoneNumber?: string;
      mapsUrl?: string;
    };
  };
}

// Union type for all possible return types
export type InventoryAssignmentWithRelations =
  | InventoryAssignmentBasic
  | InventoryAssignmentWithUser
  | InventoryAssignmentWithStore
  | InventoryAssignmentWithUserAndStore;

export interface InventoryAssignmentWithDetailsAndRelations
  extends InventoryAssignmentType {
  tanks: (AssignmentTankType & { tankDetails: TankType })[];
  items: (AssignmentItemType & { itemDetails: InventoryItem })[];
  storeAssignment?: {
    assignmentId: number;
    userId: number;
    storeId: number;
    startDate: string;
    user?: {
      userId: number;
      name: string;
      userProfile?: {
        firstName: string;
        lastName: string;
        entryDate: string;
      };
    };
    store?: {
      storeId: number;
      name: string;
      address: string;
      latitude?: string;
      longitude?: string;
      phoneNumber?: string;
      mapsUrl?: string;
    };
  };
}
