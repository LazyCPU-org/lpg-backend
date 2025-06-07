// src/routes/inventoryStatusHistoryRoutes.ts
import { Request, Response, Router } from "express";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { IInventoryStatusHistoryService } from "../services/inventory";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildInventoryStatusHistoryRouter(
  statusHistoryService: IInventoryStatusHistoryService
) {
  const router = Router();

  /**
   * @openapi
   * /inventory/status-history/{inventoryId}:
   *   get:
   *     tags: [Inventory]
   *     summary: Get status history for specific inventory
   *     description: Retrieves complete status change history for an inventory assignment
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: inventoryId
   *         schema:
   *           type: integer
   *         required: true
   *         description: Inventory assignment ID
   *       - in: query
   *         name: includeRelations
   *         schema:
   *           type: boolean
   *         description: Include user and assignment details
   *     responses:
   *       200:
   *         description: Status history for the inventory
   *       404:
   *         description: Inventory not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/:inventoryId",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const inventoryId = parseInt(req.params.inventoryId);
      const includeRelations = req.query.includeRelations === "true";

      const history = await statusHistoryService.getHistoryByInventoryId(
        inventoryId,
        includeRelations
      );

      res.json(history);
    })
  );

  /**
   * @openapi
   * /inventory/status-history/audit:
   *   get:
   *     tags: [Inventory]
   *     summary: Get audit report for status changes
   *     description: Generates a comprehensive audit report for inventory status changes in a date range
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Start date for audit report
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: End date for audit report
   *     responses:
   *       200:
   *         description: Audit report with statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalChanges:
   *                   type: integer
   *                 changesByStatus:
   *                   type: object
   *                 automatedChanges:
   *                   type: integer
   *                 manualChanges:
   *                   type: integer
   *                 staleRecoveries:
   *                   type: integer
   *       400:
   *         description: Invalid date parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/audit",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "startDate y endDate son requeridos",
        });
      }

      const auditReport = await statusHistoryService.getAuditReport(
        startDate as string,
        endDate as string
      );

      res.json(auditReport);
    })
  );

  /**
   * @openapi
   * /inventory/status-history/stale-recoveries:
   *   get:
   *     tags: [Inventory]
   *     summary: Get stale inventory recovery incidents
   *     description: Retrieves all cases where stale inventories were automatically recovered
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: daysThreshold
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Minimum days threshold to consider inventory as stale
   *     responses:
   *       200:
   *         description: List of stale inventory recovery incidents
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/stale-recoveries",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const daysThreshold = req.query.daysThreshold
        ? parseInt(req.query.daysThreshold as string)
        : 1;

      const staleRecoveries =
        await statusHistoryService.getStaleInventoryConsolidations(
          daysThreshold
        );

      res.json(staleRecoveries);
    })
  );

  /**
   * @openapi
   * /inventory/status-history/date-range:
   *   get:
   *     tags: [Inventory]
   *     summary: Get status history by date range
   *     description: Retrieves all status changes within a specified date range
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Start date for filtering
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: End date for filtering
   *       - in: query
   *         name: includeRelations
   *         schema:
   *           type: boolean
   *         description: Include user and assignment details
   *     responses:
   *       200:
   *         description: Status history within date range
   *       400:
   *         description: Invalid date parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/date-range",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const { startDate, endDate } = req.query;
      const includeRelations = req.query.includeRelations === "true";

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: "startDate y endDate son requeridos",
        });
      }

      const history = await statusHistoryService.getHistoryByDateRange(
        startDate as string,
        endDate as string,
        includeRelations
      );

      res.json(history);
    })
  );

  return router;
}
