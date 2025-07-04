import { Request, Response, Router } from "express";
import {
  CreateInventoryAssignmentRequestSchema,
  GetInventoryAssignmentsRequestSchema,
  UpdateInventoryAssignmentStatusRequestSchema,
} from "../dtos/request/inventoryAssignmentDTO";
import { InventoryAssignmentRelationOptions } from "../dtos/response/inventoryAssignmentInterface";
import { asyncHandler } from "../middlewares/async-handler";
import {
  AuthRequest,
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { parseIncludeRelations } from "../middlewares/include-relations";
import { IInventoryAssignmentService } from "../services/inventory";
import { UnauthorizedError } from "../utils/custom-errors";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildInventoryAssignmentRouter(
  inventoryAssignmentService: IInventoryAssignmentService
) {
  const router = Router();

  /**
   * @openapi
   * /inventory/assignments:
   *   get:
   *     tags: [Inventory]
   *     summary: Get inventory assignments
   *     description: Retrieves inventory assignments filtered by user, store, date, and/or status with optional related data
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
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *         required: false
   *         description: |
   *           Relations to include in the response.
   *           Format options:
   *           - Comma-separated: `user,store`
   *           - JSON format: `{"user":true,"store":true}`
   *
   *           Available relations:
   *           - `user`: Include assigned user information through storeAssignment
   *           - `store`: Include store information through storeAssignment
   *     responses:
   *       200:
   *         description: A list of inventory assignments with requested relations
   *       400:
   *         description: Invalid include parameter format
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    parseIncludeRelations,
    asyncHandler(async (req: Request, res: Response) => {
      const queryParams = GetInventoryAssignmentsRequestSchema.parse({
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        storeId: req.query.storeId ? Number(req.query.storeId) : undefined,
        date: req.query.date,
        status: req.query.status,
      });

      // Convert include relations to repository options
      const relationOptions: InventoryAssignmentRelationOptions = {
        user: Boolean(req.includeRelations?.user),
        store: Boolean(req.includeRelations?.store),
      };

      const assignments = await inventoryAssignmentService.findAssignments(
        queryParams.userId,
        queryParams.storeId,
        queryParams.date,
        queryParams.status,
        relationOptions
      );

      res.json(assignments);
    })
  );

  /**
   * @openapi
   * /inventory/assignments/{id}:
   *   get:
   *     tags: [Inventory]
   *     summary: Get inventory assignment by ID
   *     description: Retrieves a specific inventory assignment with all associated tanks and items, and optional user/store relations
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Inventory assignment ID
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *         required: false
   *         description: |
   *           Relations to include in the response.
   *           Format options:
   *           - Comma-separated: `user,store`
   *           - JSON format: `{"user":true,"store":true}`
   *
   *           Available relations:
   *           - `user`: Include assigned user information through storeAssignment
   *           - `store`: Include store information through storeAssignment
   *     responses:
   *       200:
   *         description: Inventory assignment details with requested relations
   *       400:
   *         description: Invalid include parameter format
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
    parseIncludeRelations,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);

      // Convert include relations to repository options
      const relationOptions: InventoryAssignmentRelationOptions = {
        user: Boolean(req.includeRelations?.user),
        store: Boolean(req.includeRelations?.store),
      };

      const assignment = await inventoryAssignmentService.findAssignmentById(
        id,
        relationOptions
      );
      res.json(assignment);
    })
  );

  /**
   * @openapi
   * /inventory/assignments:
   *   post:
   *     tags: [Inventory]
   *     summary: Create a new inventory assignment
   *     description: |
   *       Creates a new inventory assignment with catalog-based items and tanks.
   *       This endpoint automatically populates tanks and items from the store catalog
   *       with initial assigned quantities set to 0.
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
   *         description: Assignment created successfully with catalog items populated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 inventoryId:
   *                   type: integer
   *                   description: The created inventory assignment ID
   *                 assignmentId:
   *                   type: integer
   *                 assignmentDate:
   *                   type: string
   *                   format: date
   *                 status:
   *                   type: string
   *                   enum: [created]
   *                 tanks:
   *                   type: array
   *                   description: Auto-populated from store catalog with initial quantities of 0
   *                   items:
   *                     type: object
   *                 items:
   *                   type: array
   *                   description: Auto-populated from store catalog with initial quantities of 0
   *                   items:
   *                     type: object
   *       400:
   *         description: Invalid input data or assignment already exists for this date
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store assignment not found
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const data = CreateInventoryAssignmentRequestSchema.parse(req.body);

      // Get the current user ID from the token
      const assignedBy = req.user?.id || "0";

      const assignment =
        await inventoryAssignmentService.createInventoryAssignment(
          data.assignmentId,
          data.assignmentDate,
          parseInt(assignedBy),
          data.notes
        );

      res.json(assignment);
    })
  );

  /**
   * @openapi
   * /inventory/assignments/{id}/status:
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
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      if (!userId)
        throw new UnauthorizedError("Usuario autenticado no encontrado");
      const requestData = UpdateInventoryAssignmentStatusRequestSchema.parse(
        req.body
      );

      const assignment =
        await inventoryAssignmentService.updateAssignmentStatus(
          id,
          requestData.status,
          Number.parseInt(userId)
        );

      res.json(assignment);
    })
  );

  return router;
}
