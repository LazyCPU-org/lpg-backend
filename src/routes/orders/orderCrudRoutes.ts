import { Response, Router } from "express";
import {
  CreateOrderRequestSchema,
  GetOrdersRequestSchema,
  UpdateOrderRequestSchema,
} from "../../dtos/request/orderDTO";
import { OrderRelationOptions } from "../../dtos/response/orderInterface";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  AuthRequest,
  isAuthenticated,
  requirePermission,
} from "../../middlewares/authorization";
import { parseIncludeRelations } from "../../middlewares/include-relations";
import { BadRequestError, NotFoundError } from "../../utils/custom-errors";
import { ActionEnum, ModuleEnum } from "../../utils/permissions";
import { paginationUtils, responseBody } from "../../utils/response-helpers";
import { OrderRoutesDependencies } from "./index";

/**
 * Order CRUD Routes - Core order management operations
 * Handles: Create, Read, Update, Cancel orders
 */
export function buildOrderCrudRoutes(dependencies: OrderRoutesDependencies) {
  const { orderService } = dependencies;
  const router = Router();

  /**
   * @openapi
   * /orders:
   *   post:
   *     tags: [Orders]
   *     summary: Create a new order
   *     description: Creates a new customer order with items and sets initial status to PENDING
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateOrderRequest'
   *     responses:
   *       201:
   *         description: Order created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderWithDetailsResponse'
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Store not found or inactive
   *       409:
   *         description: Inventory not available
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderData = CreateOrderRequestSchema.parse(req.body);

      // Add creator information from authenticated user
      if (!req.user?.id) {
        throw new BadRequestError("User authentication required");
      }

      const result = await orderService.createOrder(
        orderData,
        Number.parseInt(req.user.id)
      );

      res.status(201).json({
        success: true,
        data: result,
        message: "Order created successfully",
      });
    })
  );

  /**
   * @openapi
   * /orders:
   *   get:
   *     tags: [Orders]
   *     summary: List orders with filtering
   *     description: Retrieves orders filtered by various criteria with optional related data
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: storeId
   *         schema:
   *           type: integer
   *         description: Filter by store ID
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filter by order status (comma-separated for multiple)
   *       - in: query
   *         name: customerId
   *         schema:
   *           type: integer
   *         description: Filter by customer ID
   *       - in: query
   *         name: orderNumber
   *         schema:
   *           type: string
   *         description: Filter by order number
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter orders from this date
   *       - in: query
   *         name: dateTo
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter orders up to this date
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *         description: Include related data (items,reservations,transactions,deliveries,customer,invoice)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: sort
   *         schema:
   *           type: string
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: order
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Orders retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderListResponse'
   */
  router.get(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    parseIncludeRelations,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const filters = GetOrdersRequestSchema.parse(req.query);
      const include = req.includeRelations as OrderRelationOptions;

      const result = await orderService.findOrders(
        filters.storeId,
        filters.customerId,
        filters.status,
        filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        filters.dateTo ? new Date(filters.dateTo) : undefined,
        filters.limit,
        filters.offset,
        include
      );

      // Create pagination info
      const pagination = paginationUtils.create(
        result.length, // Note: This should be total count from database in real implementation
        filters.page || 1,
        filters.limit || 10
      );

      // Return structured response body
      res.json(responseBody.paginatedFiltered(result, pagination, filters));
    })
  );

  /**
   * @openapi
   * /orders/{orderId}:
   *   get:
   *     tags: [Orders]
   *     summary: Get order by ID
   *     description: Retrieves detailed information for a specific order
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Order ID
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *         description: Include related data (items,reservations,transactions,deliveries,customer,invoice)
   *     responses:
   *       200:
   *         description: Order retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderWithDetailsResponse'
   *       404:
   *         description: Order not found
   */
  router.get(
    "/:orderId",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    parseIncludeRelations,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const include = (req as any).includeRelations;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      const result = await orderService.getOrder(
        orderId,
        include?.items || false,
        include?.customer || false,
        include?.statusHistory || false
      );

      if (!result) {
        throw new NotFoundError("Order not found");
      }

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /orders/{orderId}:
   *   put:
   *     tags: [Orders]
   *     summary: Update order
   *     description: Updates order details (only for orders in PENDING or CONFIRMED status)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Order ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateOrderRequest'
   *     responses:
   *       200:
   *         description: Order updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderWithDetailsResponse'
   *       400:
   *         description: Invalid request data or order cannot be updated
   *       404:
   *         description: Order not found
   */
  router.put(
    "/:orderId",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const updateData = UpdateOrderRequestSchema.parse(req.body);

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      const result = await orderService.updateOrder(
        orderId,
        updateData.customerName,
        updateData.customerPhone,
        updateData.deliveryAddress,
        updateData.notes,
        Number.parseInt(req.user!.id)
      );

      res.json(result);
    })
  );

  /**
   * @openapi
   * /orders/{orderId}:
   *   delete:
   *     tags: [Orders]
   *     summary: Cancel order
   *     description: Cancels an order and restores any reserved inventory
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: integer
   *         description: Order ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for cancellation
   *               notes:
   *                 type: string
   *                 description: Additional notes
   *             required:
   *               - reason
   *     responses:
   *       200:
   *         description: Order cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderWithDetailsResponse'
   *       400:
   *         description: Order cannot be cancelled in current status
   *       404:
   *         description: Order not found
   */
  router.delete(
    "/:orderId",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.DELETE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const { reason, notes } = req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      if (!reason) {
        throw new BadRequestError("Cancellation reason is required");
      }

      await orderService.deleteOrder(
        orderId,
        reason,
        Number.parseInt(req.user!.id)
      );

      const result = await orderService.getOrder(orderId, true, true, true);

      res.json(result);
    })
  );

  return router;
}
