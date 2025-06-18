import { z } from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTankTypeRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 50
 *           description: Name of the tank type
 *         weight:
 *           type: string
 *           maxLength: 5
 *           description: Weight specification of the tank
 *         description:
 *           type: string
 *           description: Optional description of the tank type
 *         purchase_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Purchase price of the tank
 *         sell_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Selling price of the tank
 *         scale:
 *           type: string
 *           maxLength: 10
 *           description: Scale unit for the tank (defaults to "unidad")
 *       required:
 *         - name
 *         - weight
 *         - purchase_price
 *         - sell_price
 */
export const CreateTankTypeRequestSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(50, "Nombre debe tener máximo 50 caracteres"),
  weight: z.string().min(1, "Peso es requerido").max(5, "Peso debe tener máximo 5 caracteres"),
  description: z.string().optional(),
  purchase_price: z.number().positive("Precio de compra debe ser positivo"),
  sell_price: z.number().positive("Precio de venta debe ser positivo"),
  scale: z.string().max(10, "Escala debe tener máximo 10 caracteres").optional(),
}).refine((data) => data.sell_price > data.purchase_price, {
  message: "Precio de venta debe ser mayor al precio de compra",
  path: ["sell_price"],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateTankTypeRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 50
 *           description: Name of the tank type
 *         weight:
 *           type: string
 *           maxLength: 5
 *           description: Weight specification of the tank
 *         description:
 *           type: string
 *           description: Optional description of the tank type
 *         purchase_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Purchase price of the tank
 *         sell_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Selling price of the tank
 *         scale:
 *           type: string
 *           maxLength: 10
 *           description: Scale unit for the tank
 */
export const UpdateTankTypeRequestSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(50, "Nombre debe tener máximo 50 caracteres").optional(),
  weight: z.string().min(1, "Peso es requerido").max(5, "Peso debe tener máximo 5 caracteres").optional(),
  description: z.string().optional(),
  purchase_price: z.number().positive("Precio de compra debe ser positivo").optional(),
  sell_price: z.number().positive("Precio de venta debe ser positivo").optional(),
  scale: z.string().max(10, "Escala debe tener máximo 10 caracteres").optional(),
}).refine((data) => {
  if (data.sell_price !== undefined && data.purchase_price !== undefined) {
    return data.sell_price > data.purchase_price;
  }
  return true;
}, {
  message: "Precio de venta debe ser mayor al precio de compra",
  path: ["sell_price"],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateInventoryItemRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the inventory item
 *         description:
 *           type: string
 *           description: Optional description of the inventory item
 *         purchase_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Purchase price of the item
 *         sell_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Selling price of the item
 *         scale:
 *           type: string
 *           maxLength: 10
 *           description: Scale unit for the item
 *       required:
 *         - name
 *         - purchase_price
 *         - sell_price
 *         - scale
 */
export const CreateInventoryItemRequestSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(100, "Nombre debe tener máximo 100 caracteres"),
  description: z.string().optional(),
  purchase_price: z.number().positive("Precio de compra debe ser positivo"),
  sell_price: z.number().positive("Precio de venta debe ser positivo"),
  scale: z.string().min(1, "Escala es requerida").max(10, "Escala debe tener máximo 10 caracteres"),
}).refine((data) => data.sell_price > data.purchase_price, {
  message: "Precio de venta debe ser mayor al precio de compra",
  path: ["sell_price"],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateInventoryItemRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the inventory item
 *         description:
 *           type: string
 *           description: Optional description of the inventory item
 *         purchase_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Purchase price of the item
 *         sell_price:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           description: Selling price of the item
 *         scale:
 *           type: string
 *           maxLength: 10
 *           description: Scale unit for the item
 */
export const UpdateInventoryItemRequestSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(100, "Nombre debe tener máximo 100 caracteres").optional(),
  description: z.string().optional(),
  purchase_price: z.number().positive("Precio de compra debe ser positivo").optional(),
  sell_price: z.number().positive("Precio de venta debe ser positivo").optional(),
  scale: z.string().min(1, "Escala es requerida").max(10, "Escala debe tener máximo 10 caracteres").optional(),
}).refine((data) => {
  if (data.sell_price !== undefined && data.purchase_price !== undefined) {
    return data.sell_price > data.purchase_price;
  }
  return true;
}, {
  message: "Precio de venta debe ser mayor al precio de compra",
  path: ["sell_price"],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     ProductSearchRequest:
 *       type: object
 *       properties:
 *         q:
 *           type: string
 *           minLength: 1
 *           description: Search query term
 *         type:
 *           type: string
 *           enum: [tanks, items, all]
 *           description: Type of products to search (defaults to "all")
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           description: Maximum number of results to return (defaults to 20)
 *       required:
 *         - q
 */
export const ProductSearchRequestSchema = z.object({
  q: z.string().min(1, "Término de búsqueda es requerido"),
  type: z.enum(["tanks", "items", "all"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     TankTypeFiltersRequest:
 *       type: object
 *       properties:
 *         include_deleted:
 *           type: boolean
 *           description: Include soft-deleted tank types (defaults to false)
 *         search:
 *           type: string
 *           description: Search in name and description
 *         weight:
 *           type: string
 *           description: Filter by specific weight
 *         price_min:
 *           type: number
 *           minimum: 0
 *           description: Minimum sell price filter
 *         price_max:
 *           type: number
 *           minimum: 0
 *           description: Maximum sell price filter
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Number of results per page (defaults to 50)
 *         offset:
 *           type: integer
 *           minimum: 0
 *           description: Number of results to skip (defaults to 0)
 */
export const TankTypeFiltersRequestSchema = z.object({
  include_deleted: z.boolean().optional(),
  search: z.string().optional(),
  weight: z.string().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.price_min !== undefined && data.price_max !== undefined) {
    return data.price_max >= data.price_min;
  }
  return true;
}, {
  message: "Precio máximo debe ser mayor o igual al precio mínimo",
  path: ["price_max"],
});

/**
 * @openapi
 * components:
 *   schemas:
 *     InventoryItemFiltersRequest:
 *       type: object
 *       properties:
 *         include_deleted:
 *           type: boolean
 *           description: Include soft-deleted inventory items (defaults to false)
 *         search:
 *           type: string
 *           description: Search in name and description
 *         price_min:
 *           type: number
 *           minimum: 0
 *           description: Minimum sell price filter
 *         price_max:
 *           type: number
 *           minimum: 0
 *           description: Maximum sell price filter
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Number of results per page (defaults to 50)
 *         offset:
 *           type: integer
 *           minimum: 0
 *           description: Number of results to skip (defaults to 0)
 */
export const InventoryItemFiltersRequestSchema = z.object({
  include_deleted: z.boolean().optional(),
  search: z.string().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.price_min !== undefined && data.price_max !== undefined) {
    return data.price_max >= data.price_min;
  }
  return true;
}, {
  message: "Precio máximo debe ser mayor o igual al precio mínimo",
  path: ["price_max"],
});

// Export types
export type CreateTankTypeRequest = z.infer<typeof CreateTankTypeRequestSchema>;
export type UpdateTankTypeRequest = z.infer<typeof UpdateTankTypeRequestSchema>;
export type CreateInventoryItemRequest = z.infer<typeof CreateInventoryItemRequestSchema>;
export type UpdateInventoryItemRequest = z.infer<typeof UpdateInventoryItemRequestSchema>;
export type ProductSearchRequest = z.infer<typeof ProductSearchRequestSchema>;
export type TankTypeFiltersRequest = z.infer<typeof TankTypeFiltersRequestSchema>;
export type InventoryItemFiltersRequest = z.infer<typeof InventoryItemFiltersRequestSchema>;