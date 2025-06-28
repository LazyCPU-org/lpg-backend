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
 * Order Workflow Routes - Order status transitions and workflow management
 * Handles: Confirm, Reserve, Start Delivery, Complete Delivery, Fail Delivery
 */
export function buildOrderWorkflowRoutes(
  dependencies: OrderRoutesDependencies
) {
  const { orderWorkflowService } = dependencies;
  const router = Router();

  /**
   * @openapi
   * /orders/{orderId}/confirm:
   *   post:
   *     tags: [Orders, Workflow]
   *     summary: Confirm order
   *     description: Confirms order details and transitions from PENDING to CONFIRMED status
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
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               notes:
   *                 type: string
   *                 description: Optional confirmation notes
   *               customerVerified:
   *                 type: boolean
   *                 description: Whether customer details were verified
   *     responses:
   *       200:
   *         description: Order confirmed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderTransitionResponse'
   *       400:
   *         description: Order cannot be confirmed in current status
   *       404:
   *         description: Order not found
   */
  router.post(
    "/:orderId/confirm",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const { notes, customerVerified } = req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      const result = await orderWorkflowService.confirmOrderDetailed(
        orderId,
        parseInt(req.user!.id),
        notes
      );

      res.json({
        success: true,
        data: result,
        message: "Order confirmed successfully",
      });
    })
  );

  /**
   * @openapi
   * /orders/{orderId}/start-delivery:
   *   post:
   *     tags: [Orders, Workflow]
   *     summary: Start delivery process
   *     description: Assigns delivery user and transitions from RESERVED to IN_TRANSIT status
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
   *               deliveryUserId:
   *                 type: integer
   *                 description: ID of delivery user (optional, defaults to authenticated user)
   *               estimatedDeliveryTime:
   *                 type: string
   *                 format: date-time
   *                 description: Estimated delivery time
   *               deliveryNotes:
   *                 type: string
   *                 description: Delivery instructions
   *     responses:
   *       200:
   *         description: Delivery started successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderTransitionResponse'
   *       400:
   *         description: Order cannot be started for delivery
   *       404:
   *         description: Order not found
   */
  router.post(
    "/:orderId/start-delivery",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const { deliveryUserId, estimatedDeliveryTime, deliveryNotes } = req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      // Use provided delivery user ID or default to authenticated user
      const actualDeliveryUserId = deliveryUserId || parseInt(req.user!.id);

      const result = await orderWorkflowService.startDeliveryDetailed(
        orderId,
        actualDeliveryUserId,
        deliveryNotes
      );

      res.json({
        success: true,
        data: result,
        message: "Delivery started successfully",
      });
    })
  );

  /**
   * @openapi
   * /orders/{orderId}/complete:
   *   post:
   *     tags: [Orders, Workflow]
   *     summary: Complete delivery
   *     description: Marks delivery as complete, creates inventory transactions, and transitions to DELIVERED status
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
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               customerSignature:
   *                 type: string
   *                 description: Customer signature or confirmation
   *               deliveryNotes:
   *                 type: string
   *                 description: Delivery completion notes
   *               paymentReceived:
   *                 type: boolean
   *                 description: Whether payment was received (for cash orders)
   *               generateInvoice:
   *                 type: boolean
   *                 description: Whether to generate invoice immediately
   *     responses:
   *       200:
   *         description: Delivery completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderTransitionResponse'
   *       400:
   *         description: Order cannot be completed
   *       404:
   *         description: Order not found
   */
  router.post(
    "/:orderId/complete",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const {
        customerSignature,
        deliveryNotes,
        paymentReceived,
        generateInvoice,
      } = req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      const result = await orderWorkflowService.completeDeliveryDetailed(
        orderId,
        parseInt(req.user!.id),
        customerSignature,
        deliveryNotes
      );

      res.json({
        success: true,
        data: result,
        message: "Delivery completed successfully",
      });
    })
  );

  /**
   * @openapi
   * /orders/{orderId}/fail:
   *   post:
   *     tags: [Orders, Workflow]
   *     summary: Mark delivery as failed
   *     description: Handles delivery failure, restores inventory reservations, and transitions to FAILED status
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
   *                 description: Reason for delivery failure
   *               failureNotes:
   *                 type: string
   *                 description: Detailed failure notes
   *               rescheduleDate:
   *                 type: string
   *                 format: date
   *                 description: Proposed reschedule date
   *               customerNotified:
   *                 type: boolean
   *                 description: Whether customer was notified
   *             required:
   *               - reason
   *     responses:
   *       200:
   *         description: Delivery failure recorded successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderTransitionResponse'
   *       400:
   *         description: Order cannot be marked as failed
   *       404:
   *         description: Order not found
   */
  router.post(
    "/:orderId/fail",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const { reason, failureNotes, rescheduleDate, customerNotified } =
        req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      if (!reason) {
        throw new BadRequestError("Failure reason is required");
      }

      const result = await orderWorkflowService.failDeliveryDetailed(
        orderId,
        reason,
        parseInt(req.user!.id),
        false // reschedule parameter
      );

      res.json({
        success: true,
        data: result,
        message: "Delivery failure recorded successfully",
      });
    })
  );

  /**
   * @openapi
   * /orders/{orderId}/status:
   *   patch:
   *     tags: [Orders, Workflow]
   *     summary: Manual status update
   *     description: Manually update order status (admin only for emergency situations)
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
   *               status:
   *                 type: string
   *                 enum: [pending, confirmed, reserved, in_transit, delivered, fulfilled, cancelled, failed]
   *                 description: New order status
   *               reason:
   *                 type: string
   *                 description: Reason for manual status change
   *               notes:
   *                 type: string
   *                 description: Additional notes
   *             required:
   *               - status
   *               - reason
   *     responses:
   *       200:
   *         description: Status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OrderWithDetailsResponse'
   *       400:
   *         description: Invalid status transition
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Order not found
   */
  router.patch(
    "/:orderId/status",
    isAuthenticated,
    requirePermission(ModuleEnum.ORDERS, ActionEnum.ADMIN), // Admin-only operation
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const orderId = parseInt(req.params.orderId);
      const { status, reason, notes } = req.body;

      if (isNaN(orderId)) {
        throw new BadRequestError("Invalid order ID");
      }

      if (!status || !reason) {
        throw new BadRequestError("Status and reason are required");
      }

      // Since updateOrderStatusManual doesn't exist, use cancelOrderDetailed for cancellation
      // or throw error for other manual status changes
      if (status === "cancelled") {
        const result = await orderWorkflowService.cancelOrderDetailed(
          orderId,
          reason,
          parseInt(req.user!.id)
        );
        res.json({
          success: true,
          data: result,
          message: "Order status updated successfully",
        });
        return;
      }

      throw new BadRequestError(
        "Manual status updates not supported for this status"
      );
    })
  );

  return router;
}
