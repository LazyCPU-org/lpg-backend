import { z } from "zod";
import { 
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum
} from "../../db/schemas/orders/order-status-types";
import { 
  ItemTypeEnum,
  DeliveryStatusEnum
} from "../../db/schemas/orders";

const validatePrice = (val: string) => {
  const numVal = parseFloat(val);
  return !isNaN(numVal) && numVal > 0;
};

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderItemRequest:
 *       type: object
 *       properties:
 *         itemType:
 *           type: string
 *           enum: [tank, item]
 *           description: Type of item being ordered
 *         tankTypeId:
 *           type: integer
 *           description: ID of the tank type (required if itemType is 'tank')
 *         inventoryItemId:
 *           type: integer
 *           description: ID of the inventory item (required if itemType is 'item')
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of items to order
 *         unitPrice:
 *           type: string
 *           description: Unit price of the item (positive number)
 *       required:
 *         - itemType
 *         - quantity
 *         - unitPrice
 */
export const OrderItemRequestSchema = z.object({
  itemType: z.enum([ItemTypeEnum.TANK, ItemTypeEnum.ITEM], {
    errorMap: () => ({ message: "Tipo de artículo inválido" }),
  }),
  tankTypeId: z.number().positive("ID de tipo de tanque inválido").optional(),
  inventoryItemId: z.number().positive("ID de artículo inválido").optional(),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  unitPrice: z.string().refine(validatePrice, {
    message: "Precio unitario debe ser un número positivo",
  }),
}).refine(
  (data) => {
    if (data.itemType === ItemTypeEnum.TANK) {
      return data.tankTypeId !== undefined;
    }
    if (data.itemType === ItemTypeEnum.ITEM) {
      return data.inventoryItemId !== undefined;
    }
    return false;
  },
  {
    message: "Debe proporcionar tankTypeId para tanques o inventoryItemId para artículos",
    path: ["itemType"],
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateOrderRequest:
 *       type: object
 *       properties:
 *         storeId:
 *           type: integer
 *           description: ID of the store where the order will be fulfilled
 *         customerId:
 *           type: integer
 *           description: ID of the customer (optional for quick orders)
 *         customerName:
 *           type: string
 *           description: Customer name (required if customerId not provided)
 *         customerPhone:
 *           type: string
 *           description: Customer phone (required if customerId not provided)
 *         deliveryAddress:
 *           type: string
 *           description: Address where the order should be delivered
 *         locationReference:
 *           type: string
 *           description: Additional location reference or landmarks
 *         paymentMethod:
 *           type: string
 *           enum: [cash, yape, plin, transfer]
 *           description: Payment method for the order
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, debt]
 *           description: Payment status
 *         priority:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Order priority (1 = highest, 5 = lowest)
 *         notes:
 *           type: string
 *           description: Additional notes for the order
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItemRequest'
 *           description: List of items to order
 *       required:
 *         - storeId
 *         - deliveryAddress
 *         - paymentMethod
 *         - paymentStatus
 *         - items
 */
export const CreateOrderRequestSchema = z.object({
  storeId: z.number().positive("ID de tienda inválido"),
  customerId: z.number().positive("ID de cliente inválido").optional(),
  customerName: z.string().min(1, "Nombre del cliente es requerido").optional(),
  customerPhone: z.string().min(1, "Teléfono del cliente es requerido").optional(),
  deliveryAddress: z.string().min(1, "Dirección de entrega es requerida"),
  locationReference: z.string().optional(),
  paymentMethod: z.enum([
    PaymentMethodEnum.CASH,
    PaymentMethodEnum.YAPE,
    PaymentMethodEnum.PLIN,
    PaymentMethodEnum.TRANSFER,
  ], {
    errorMap: () => ({ message: "Método de pago inválido" }),
  }),
  paymentStatus: z.enum([
    PaymentStatusEnum.PENDING,
    PaymentStatusEnum.PAID,
    PaymentStatusEnum.DEBT,
  ], {
    errorMap: () => ({ message: "Estado de pago inválido" }),
  }),
  priority: z.number().min(1).max(5).default(1),
  notes: z.string().optional(),
  items: z.array(OrderItemRequestSchema).min(1, "Debe incluir al menos un artículo"),
}).refine(
  (data) => {
    // Either customerId OR (customerName AND customerPhone) must be provided
    if (data.customerId) {
      return true; // Customer ID provided
    }
    return data.customerName && data.customerPhone; // Both name and phone provided
  },
  {
    message: "Debe proporcionar ID de cliente o nombre y teléfono del cliente",
    path: ["customerId"],
  }
);

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateOrderStatusRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
 *           description: The new status for the order
 *         reason:
 *           type: string
 *           description: Reason for the status change
 *         notes:
 *           type: string
 *           description: Additional notes about the status change
 *       required:
 *         - status
 */
export const UpdateOrderStatusRequestSchema = z.object({
  status: z.enum([
    OrderStatusEnum.PENDING,
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.RESERVED,
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.FULFILLED,
    OrderStatusEnum.CANCELLED,
    OrderStatusEnum.FAILED,
  ], {
    errorMap: () => ({ message: "Estado de orden inválido" }),
  }),
  reason: z.string().min(1, "Razón del cambio es requerida"),
  notes: z.string().optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     GetOrdersRequest:
 *       type: object
 *       properties:
 *         storeId:
 *           type: integer
 *           description: Filter by store ID (optional)
 *         customerId:
 *           type: integer
 *           description: Filter by customer ID (optional)
 *         status:
 *           type: string
 *           enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
 *           description: Filter by order status (optional)
 *         deliveryUserId:
 *           type: integer
 *           description: Filter by delivery user ID (optional)
 *         dateFrom:
 *           type: string
 *           format: date
 *           description: Filter orders from this date (optional)
 *         dateTo:
 *           type: string
 *           format: date
 *           description: Filter orders until this date (optional)
 *         orderNumber:
 *           type: string
 *           description: Filter by order number (optional)
 *         include:
 *           type: string
 *           description: Include relations (comma-separated - items,reservations,transactions,deliveries,customer,invoice)
 */
export const GetOrdersRequestSchema = z.object({
  storeId: z.number().positive("ID de tienda inválido").optional(),
  customerId: z.number().positive("ID de cliente inválido").optional(),
  status: z.enum([
    OrderStatusEnum.PENDING,
    OrderStatusEnum.CONFIRMED,
    OrderStatusEnum.RESERVED,
    OrderStatusEnum.IN_TRANSIT,
    OrderStatusEnum.DELIVERED,
    OrderStatusEnum.FULFILLED,
    OrderStatusEnum.CANCELLED,
    OrderStatusEnum.FAILED,
  ], {
    errorMap: () => ({ message: "Estado de orden inválido" }),
  }).optional(),
  deliveryUserId: z.number().positive("ID de usuario de entrega inválido").optional(),
  dateFrom: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "Fecha desde inválida",
  }).optional(),
  dateTo: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "Fecha hasta inválida",
  }).optional(),
  orderNumber: z.string().optional(),
  include: z.string().optional(),
  page: z.number().positive().default(1).optional(),
  limit: z.number().positive().default(10).optional(),
  offset: z.number().min(0).default(0).optional(),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CheckAvailabilityRequest:
 *       type: object
 *       properties:
 *         storeId:
 *           type: integer
 *           description: ID of the store to check inventory
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               itemType:
 *                 type: string
 *                 enum: [tank, item]
 *               tankTypeId:
 *                 type: integer
 *               inventoryItemId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *             required:
 *               - itemType
 *               - quantity
 *           description: List of items to check availability
 *       required:
 *         - storeId
 *         - items
 */
export const CheckAvailabilityRequestSchema = z.object({
  storeId: z.number().positive("ID de tienda inválido"),
  items: z.array(
    z.object({
      itemType: z.enum([ItemTypeEnum.TANK, ItemTypeEnum.ITEM]),
      tankTypeId: z.number().positive().optional(),
      inventoryItemId: z.number().positive().optional(),
      quantity: z.number().positive("La cantidad debe ser mayor a cero"),
    }).refine(
      (data) => {
        if (data.itemType === ItemTypeEnum.TANK) {
          return data.tankTypeId !== undefined;
        }
        if (data.itemType === ItemTypeEnum.ITEM) {
          return data.inventoryItemId !== undefined;
        }
        return false;
      },
      {
        message: "Debe proporcionar tankTypeId para tanques o inventoryItemId para artículos",
      }
    )
  ).min(1, "Debe incluir al menos un artículo"),
});

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateOrderRequest:
 *       type: object
 *       properties:
 *         customerName:
 *           type: string
 *           description: Updated customer name
 *         customerPhone:
 *           type: string
 *           description: Updated customer phone
 *         deliveryAddress:
 *           type: string
 *           description: Updated delivery address
 *         locationReference:
 *           type: string
 *           description: Updated location reference
 *         paymentMethod:
 *           type: string
 *           enum: [cash, yape, plin, transfer]
 *           description: Updated payment method
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, debt]
 *           description: Updated payment status
 *         priority:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Updated order priority
 *         notes:
 *           type: string
 *           description: Updated order notes
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItemRequest'
 *           description: Updated list of items
 */
export const UpdateOrderRequestSchema = z.object({
  customerName: z.string().min(1, "Nombre del cliente es requerido").optional(),
  customerPhone: z.string().min(1, "Teléfono del cliente es requerido").optional(),
  deliveryAddress: z.string().min(1, "Dirección de entrega es requerida").optional(),
  locationReference: z.string().optional(),
  paymentMethod: z.enum([
    PaymentMethodEnum.CASH,
    PaymentMethodEnum.YAPE,
    PaymentMethodEnum.PLIN,
    PaymentMethodEnum.TRANSFER,
  ], {
    errorMap: () => ({ message: "Método de pago inválido" }),
  }).optional(),
  paymentStatus: z.enum([
    PaymentStatusEnum.PENDING,
    PaymentStatusEnum.PAID,
    PaymentStatusEnum.DEBT,
  ], {
    errorMap: () => ({ message: "Estado de pago inválido" }),
  }).optional(),
  priority: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemRequestSchema).min(1, "Debe incluir al menos un artículo").optional(),
});

// Export types
export type OrderItemRequest = z.infer<typeof OrderItemRequestSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusRequestSchema>;
export type GetOrdersRequest = z.infer<typeof GetOrdersRequestSchema>;
export type CheckAvailabilityRequest = z.infer<typeof CheckAvailabilityRequestSchema>;