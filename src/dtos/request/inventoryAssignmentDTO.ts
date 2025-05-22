import { z } from "zod";
import { AssignmentStatusEnum } from "../../db/schemas/inventory/inventory-assignments";

const validatePrice = (val: string) => {
  const numVal = parseFloat(val);
  return !isNaN(numVal) && numVal > 0;
};

/**
 * @openapi
 * components:
 *   schemas:
 *     TankAssignmentRequest:
 *       type: object
 *       properties:
 *         tankTypeId:
 *           type: integer
 *           description: ID of the tank type
 *         purchase_price:
 *           type: string
 *           description: Purchase price of the tank (positive number)
 *         sell_price:
 *           type: string
 *           description: Sell price of the tank (positive number)
 *         assignedFullTanks:
 *           type: integer
 *           description: Number of full tanks assigned (non-negative)
 *         assignedEmptyTanks:
 *           type: integer
 *           description: Number of empty tanks assigned (non-negative)
 *       required:
 *         - tankTypeId
 *         - purchase_price
 *         - sell_price
 *         - assignedFullTanks
 *         - assignedEmptyTanks
 */
export const TankAssignmentRequestSchema = z.object({
  tankTypeId: z.number().positive("Id del tipo de tanque inválido"),
  purchase_price: z.string().refine(validatePrice, {
    message: "Precio de compra debe ser un número positivo",
  }),
  sell_price: z.string().refine(validatePrice, {
    message: "Precio de venta debe ser un número positivo",
  }),
  assignedFullTanks: z
    .number()
    .nonnegative("La cantidad de tanques llenos debe ser positiva o cero"),
  assignedEmptyTanks: z
    .number()
    .nonnegative("La cantidad de tanques vacíos debe ser positiva o cero"),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     ItemAssignmentRequest:
 *       type: object
 *       properties:
 *         inventoryItemId:
 *           type: integer
 *           description: ID of the inventory item
 *         purchase_price:
 *           type: string
 *           description: Purchase price of the item (positive number)
 *         sell_price:
 *           type: string
 *           description: Sell price of the item (positive number)
 *         assignedItems:
 *           type: integer
 *           description: Number of items assigned (non-negative)
 *       required:
 *         - inventoryItemId
 *         - purchase_price
 *         - sell_price
 *         - assignedItems
 */
export const ItemAssignmentRequestSchema = z.object({
  inventoryItemId: z.number().positive("Id del artículo inválido"),
  purchase_price: z.string().refine(validatePrice, {
    message: "Precio de compra debe ser un número positivo",
  }),
  sell_price: z.string().refine(validatePrice, {
    message: "Precio de venta debe ser un número positivo",
  }),
  assignedItems: z
    .number()
    .nonnegative("La cantidad de artículos debe ser positiva o cero"),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateInventoryAssignmentRequest:
 *       type: object
 *       properties:
 *         assignmentId:
 *           type: integer
 *           description: ID of the store assignment
 *         assignmentDate:
 *           type: string
 *           format: date-time
 *           description: Date of the inventory assignment (defaults to current date)
 *         notes:
 *           type: string
 *           description: Additional notes for the assignment
 *         tanks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TankAssignmentRequest'
 *           description: List of tank assignments
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ItemAssignmentRequest'
 *           description: List of item assignments
 *       required:
 *         - assignmentId
 *         - tanks
 *         - items
 */
export const CreateInventoryAssignmentRequestSchema = z.object({
  assignmentId: z.number().positive("ID de asignación en tienda inválido"),
  assignmentDate: z
    .string()
    .default(new Date().toISOString())
    .refine((value) => !isNaN(Date.parse(value)), {
      message: "Fecha de asignación inválida",
    }),
  notes: z.string().optional(),
  tanks: z.array(TankAssignmentRequestSchema).optional(),
  items: z.array(ItemAssignmentRequestSchema).optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateInventoryAssignmentStatusRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [created, assigned, validated]
 *           description: The new status for the inventory assignment
 *       required:
 *         - status
 */
export const UpdateInventoryAssignmentStatusRequestSchema = z.object({
  status: z.enum(
    [
      AssignmentStatusEnum.ASSIGNED,
      AssignmentStatusEnum.CREATED,
      AssignmentStatusEnum.VALIDATED,
    ],
    {
      errorMap: () => ({ message: "Estado de inventario inválido" }),
    }
  ),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     GetInventoryAssignmentsRequest:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *           description: Filter by user ID (optional)
 *         storeId:
 *           type: integer
 *           description: Filter by store ID (optional)
 *         date:
 *           type: string
 *           format: date
 *           description: Filter by assignment date (optional)
 *         status:
 *           type: string
 *           enum: [created, assigned, validated]
 *           description: Filter by status (optional)
 */
export const GetInventoryAssignmentsRequestSchema = z.object({
  userId: z.number().positive("Id de usuario inválido").optional(),
  storeId: z.number().positive("Id de tienda inválido").optional(),
  date: z
    .string()
    .refine((value) => !isNaN(Date.parse(value)), {
      message: "Fecha inválida",
    })
    .optional(),
  status: z
    .enum(
      [
        AssignmentStatusEnum.ASSIGNED,
        AssignmentStatusEnum.CREATED,
        AssignmentStatusEnum.VALIDATED,
      ],
      {
        errorMap: () => ({ message: "Estado de inventario inválido" }),
      }
    )
    .optional(),
});

// Types with OpenAPI documentation now complete
export type CreateInventoryAssignmentRequest = z.infer<
  typeof CreateInventoryAssignmentRequestSchema
>;
export type UpdateInventoryAssignmentStatusRequest = z.infer<
  typeof UpdateInventoryAssignmentStatusRequestSchema
>;
export type GetInventoryAssignmentsRequest = z.infer<
  typeof GetInventoryAssignmentsRequestSchema
>;
