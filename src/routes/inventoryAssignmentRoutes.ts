import { Request, Response, Router } from "express";
import {
  CreateInventoryAssignmentRequestSchema,
  GetInventoryAssignmentsRequestSchema,
  UpdateInventoryAssignmentStatusRequestSchema,
} from "../dtos/request/inventoryAssignmentDTO";
import { asyncHandler } from "../middlewares/async-handler";
import {
  AuthRequest,
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { IInventoryAssignmentService } from "../services/inventoryAssignmentService";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildInventoryAssignmentRouter(
  inventoryAssignmentService: IInventoryAssignmentService
) {
  const router = Router();

  /**
   * @openapi
   * /api/inventory/assignments:
   *   get:
   *     tags: [Inventory]
   *     summary: Get inventory assignments
   *     description: Retrieves inventory assignments filtered by user, store, date, and/or status
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *         description: Filter by user ID
   *       - in: query
   *         name: storeId
   *         schema:
   *           type: integer
   *         description: Filter by store ID
   *       - in: query
   *         name: date
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter by assignment date
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [created, assigned, validated]
   *         description: Filter by status
   *     responses:
   *       200:
   *         description: A list of inventory assignments
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const queryParams = GetInventoryAssignmentsRequestSchema.parse({
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        storeId: req.query.storeId ? Number(req.query.storeId) : undefined,
        date: req.query.date,
        status: req.query.status,
      });

      const assignments = await inventoryAssignmentService.findAssignments(
        queryParams.userId,
        queryParams.storeId,
        queryParams.date,
        queryParams.status
      );

      res.json(assignments);
    })
  );

  /**
   * @openapi
   * /api/inventory/assignments/{id}:
   *   get:
   *     tags: [Inventory]
   *     summary: Get inventory assignment by ID
   *     description: Retrieves a specific inventory assignment with all associated tanks and items
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Inventory assignment ID
   *     responses:
   *       200:
   *         description: Inventory assignment details
   *       404:
   *         description: Assignment not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const assignment = await inventoryAssignmentService.findAssignmentById(
        id
      );
      res.json(assignment);
    })
  );

  /**
   * @openapi
   * /api/inventory/assignments:
   *   post:
   *     tags: [Inventory]
   *     summary: Create a new inventory assignment
   *     description: Creates a new inventory assignment with associated tanks and items for any given date
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInventoryAssignmentRequest'
   *     responses:
   *       200:
   *         description: Assignment created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const data = CreateInventoryAssignmentRequestSchema.parse(req.body);

      // Get the current user ID from the token
      const assignedBy = req.user?.id || "0";

      const assignment = await inventoryAssignmentService.createNewAssignment(
        data.inventoryId,
        data.assignmentDate,
        parseInt(assignedBy),
        data.notes,
        data.tanks,
        data.items
      );

      res.json(assignment);
    })
  );

  /**
   * @openapi
   * /api/inventory/assignments/{id}/status:
   *   patch:
   *     tags: [Inventory]
   *     summary: Update inventory assignment status
   *     description: Updates the status of an inventory assignment
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Inventory assignment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateInventoryAssignmentStatusRequest'
   *     responses:
   *       200:
   *         description: Status updated successfully
   *       400:
   *         description: Invalid status transition
   *       404:
   *         description: Assignment not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.patch(
    "/:id/status",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const requestData = UpdateInventoryAssignmentStatusRequestSchema.parse(
        req.body
      );

      const assignment =
        await inventoryAssignmentService.updateAssignmentStatus(
          id,
          requestData.status
        );

      res.json(assignment);
    })
  );

  return router;
}
