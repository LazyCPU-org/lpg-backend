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

// Extended types for responses with relations
export interface InventoryAssignmentWithDetails
  extends InventoryAssignmentType {
  tanks: (AssignmentTankType & { tankDetails: TankType })[];
  items: (AssignmentItemType & { itemDetails: InventoryItem })[];
}
