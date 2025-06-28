import { Response, Router } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import {
  AuthRequest,
  isAuthenticated,
  requirePermission,
} from "../../middlewares/authorization";
import { BadRequestError } from "../../utils/custom-errors";
import { ActionEnum, ModuleEnum } from "../../utils/permissions";
import { OrderRoutesDependencies } from "./index";

/**
 * Order Utility Routes - Helper endpoints and analytics
 * Handles: Search, Availability checks, Analytics, Bulk operations
 */
export function buildOrderUtilityRoutes(dependencies: OrderRoutesDependencies) {
  const { orderService, orderWorkflowService, inventoryReservationService } =
    dependencies;
  const router = Router();

  /**
   * @openapi
   * /orders/search:
   *   get:
   *     tags: [Orders, Search]
   *     summary: Advanced order search
   *     description: Search orders with advanced criteria and full-text search
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Search query (customer name, phone, order number)
   *       - in: query
   *         name: storeId
   *         schema:
   *           type: integer
   *         description: Filter by store
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *         description: Filter by status (comma-separated)
   *       - in: query
   *         name: dateRange
   *         schema:
   *           type: string
   *         description: Date range filter (today, week, month, custom)
   *       - in: query
   *         name: minTotal
   *         schema:
   *           type: number
   *         description: Minimum order total
   *       - in: query
   *         name: maxTotal
   *         schema:
   *           type: number
   *         description: Maximum order total
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of results
   *     responses:
   *       200:
   *         description: Search results
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderSearchResponse'
   */
  router.get(
    "/search",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const searchCriteria = {
        query: req.query.q as string,
        storeId: req.query.storeId
          ? parseInt(req.query.storeId as string)
          : undefined,
        status: req.query.status as string,
        dateRange: req.query.dateRange as string,
        minTotal: req.query.minTotal
          ? parseFloat(req.query.minTotal as string)
          : undefined,
        maxTotal: req.query.maxTotal
          ? parseFloat(req.query.maxTotal as string)
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await orderService.searchOrders(
        searchCriteria.query || "",
        searchCriteria.storeId,
        searchCriteria.status as any
      );

      res.json(result);
    })
  );

  /**
   * @openapi
   * /orders/check-availability:
   *   post:
   *     tags: [Orders, Inventory]
   *     summary: Check inventory availability
   *     description: Check if requested items are available for ordering
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               storeId:
   *                 type: integer
   *                 description: Store ID to check
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     itemType:
   *                       type: string
   *                       enum: [tank, item]
   *                     tankTypeId:
   *                       type: integer
   *                       description: Tank type ID (for tanks)
   *                     inventoryItemId:
   *                       type: integer
   *                       description: Inventory item ID (for items)
   *                     quantity:
   *                       type: integer
   *                       description: Requested quantity
   *             required:
   *               - storeId
   *               - items
   *     responses:
   *       200:
   *         description: Availability check results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     available:
   *                       type: boolean
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           itemType:
   *                             type: string
   *                           itemId:
   *                             type: integer
   *                           requestedQuantity:
   *                             type: integer
   *                           currentInventory:
   *                             type: integer
   *                           reservedQuantity:
   *                             type: integer
   *                           availableQuantity:
   *                             type: integer
   *                           sufficient:
   *                             type: boolean
   */
  router.post(
    "/check-availability",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { storeId, items } = req.body;

      if (!storeId || !items || !Array.isArray(items)) {
        throw new BadRequestError("Store ID and items array are required");
      }

      const result = await inventoryReservationService.checkAvailability(
        storeId
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /orders/metrics:
   *   get:
   *     tags: [Orders, Analytics]
   *     summary: Order analytics and metrics
   *     description: Get order statistics and analytics data
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [today, week, month, quarter, year]
   *           default: week
   *         description: Time period for metrics
   *       - in: query
   *         name: storeId
   *         schema:
   *           type: integer
   *         description: Filter by store (optional)
   *       - in: query
   *         name: groupBy
   *         schema:
   *           type: string
   *           enum: [day, week, month, status, store]
   *           default: day
   *         description: Group metrics by
   *     responses:
   *       200:
   *         description: Order metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalOrders:
   *                           type: integer
   *                         totalRevenue:
   *                           type: string
   *                         averageOrderValue:
   *                           type: string
   *                         completionRate:
   *                           type: number
   *                     statusBreakdown:
   *                       type: object
   *                     trends:
   *                       type: array
   *                     topItems:
   *                       type: array
   */
  router.get(
    "/metrics",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const metricsParams = {
        period: (req.query.period as string) || "week",
        storeId: req.query.storeId
          ? parseInt(req.query.storeId as string)
          : undefined,
        groupBy: (req.query.groupBy as string) || "day",
      };

      const result = await orderService.getOrderMetrics(
        metricsParams.storeId,
        metricsParams.period === "today" ? new Date() : undefined,
        new Date()
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /orders/bulk-transition:
   *   post:
   *     tags: [Orders, Bulk]
   *     summary: Bulk order status transitions
   *     description: Perform status transitions on multiple orders at once
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               orderIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *                 description: Array of order IDs
   *               action:
   *                 type: string
   *                 enum: [confirm, reserve, start-delivery, complete, cancel]
   *                 description: Action to perform
   *               parameters:
   *                 type: object
   *                 description: Action-specific parameters
   *               notes:
   *                 type: string
   *                 description: Bulk operation notes
   *             required:
   *               - orderIds
   *               - action
   *     responses:
   *       200:
   *         description: Bulk operation completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     successful:
   *                       type: array
   *                       items:
   *                         type: integer
   *                     failed:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           orderId:
   *                             type: integer
   *                           error:
   *                             type: string
   *                     summary:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: integer
   *                         successful:
   *                           type: integer
   *                         failed:
   *                           type: integer
   */
  router.post(
    "/bulk-transition",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { orderIds, action, parameters, notes } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new BadRequestError(
          "Order IDs array is required and cannot be empty"
        );
      }

      if (!action) {
        throw new BadRequestError("Action is required");
      }

      // Since bulkTransition doesn't exist in IOrderService, we'll use the workflow service
      const result = await orderWorkflowService.bulkTransition(
        orderIds,
        action as any,
        notes || "",
        parseInt(req.user!.id)
      );

      res.json({
        success: true,
        data: result,
        message: `Bulk ${action} operation completed`,
      });
    })
  );

  /**
   * @openapi
   * /orders/validate:
   *   post:
   *     tags: [Orders, Validation]
   *     summary: Validate order data
   *     description: Validate order data without creating the order
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateOrderRequest'
   *     responses:
   *       200:
   *         description: Validation results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     valid:
   *                       type: boolean
   *                     errors:
   *                       type: array
   *                       items:
   *                         type: string
   *                     warnings:
   *                       type: array
   *                       items:
   *                         type: string
   *                     estimatedTotal:
   *                       type: string
   */
  router.post(
    "/validate",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderData = req.body;

      const result = await orderService.validateOrderRequest(orderData);

      res.json({
        success: true,
        data: result,
      });
    })
  );

  return router;
}
