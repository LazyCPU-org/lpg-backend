import { Request, Response, Router } from "express";
import {
  CreateStoreAssignmentRequestSchema,
  CreateStoreRequestSchema,
  UpdateStoreLocationRequestSchema,
} from "../dtos/request/storeDTO";
import { StoreRelationOptions } from "../dtos/response/storeInterface";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { parseIncludeRelations } from "../middlewares/include-relations";
import { IStoreService } from "../services/storeService";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildStoreRouter(storeService: IStoreService) {
  const router = Router();

  /**
   * @openapi
   * /stores:
   *   get:
   *     tags: [Stores]
   *     summary: Get all stores
   *     description: Retrieves a list of all available stores
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A list of stores
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Store'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.get(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const stores = await storeService.findStoreList();
      res.json(stores);
    })
  );

  /**
   * @openapi
   * /stores/{id}:
   *   get:
   *     tags: [Stores]
   *     summary: Get store by ID
   *     description: Retrieves a store by its ID with optional related data
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Store ID
   *       - in: query
   *         name: include
   *         schema:
   *           type: string
   *         required: false
   *         description: |
   *           Relations to include in the response.
   *           Format options:
   *           - Comma-separated: `users,inventory`
   *           - JSON format: `{"users":true,"inventory":true}`
   *
   *           Available relations:
   *           - `users`: Include assigned users
   *           - `inventory`: Include current day's inventory status for each user
   *     responses:
   *       200:
   *         description: Store details with requested relations
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StoreResponse'
   *       400:
   *         description: Invalid include parameter format
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store not found
   */
  router.get(
    "/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.READ),
    parseIncludeRelations,
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = parseInt(req.params.id);

      // Convert include relations to repository options
      const relationOptions: StoreRelationOptions = {
        users: Boolean(req.includeRelations.users),
        inventory: Boolean(req.includeRelations.inventory),
      };

      const store = await storeService.findStoreById(storeId, relationOptions);
      res.json(store);
    })
  );

  /**
   * @openapi
   * /stores:
   *   post:
   *     tags: [Stores]
   *     summary: Create a new store
   *     description: Creates a new store
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - address
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *               latitude:
   *                 type: string
   *               longitude:
   *                 type: string
   *               phoneNumber:
   *                 type: string
   *               mapsUrl:
   *                 type: string
   *     responses:
   *       200:
   *         description: Store created successfully
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      const storeData = CreateStoreRequestSchema.parse(req.body);
      const store = await storeService.createNewStore(
        storeData.name,
        storeData.address,
        storeData.latitude,
        storeData.longitude,
        storeData.phoneNumber,
        storeData.mapsUrl
      );
      res.json(store);
    })
  );

  /**
   * @openapi
   * /stores/assignment:
   *   post:
   *     tags: [Stores]
   *     summary: Create a new store assignment
   *     description: Assigns a user to a store
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - storeId
   *               - userId
   *             properties:
   *               storeId:
   *                 type: integer
   *               userId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Assignment created successfully
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store or user not found
   */
  router.post(
    "/assignment",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      const requestData = CreateStoreAssignmentRequestSchema.parse(req.body);
      const storeAssignment = await storeService.createNewStoreAssignment(
        requestData.storeId,
        requestData.userId
      );
      res.json(storeAssignment);
    })
  );

  /**
   * @openapi
   * /stores/location/{id}:
   *   put:
   *     tags: [Stores]
   *     summary: Update store location
   *     description: Updates the location of a store
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Store ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - latitude
   *               - longitude
   *             properties:
   *               latitude:
   *                 type: string
   *               longitude:
   *                 type: string
   *     responses:
   *       200:
   *         description: Store location updated successfully
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store not found
   */
  router.put(
    "/location/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = parseInt(req.params.id);
      const requestData = UpdateStoreLocationRequestSchema.parse({
        ...req.body,
        storeId,
      });
      const store = await storeService.updateStoreLocation(
        requestData.storeId,
        requestData.latitude,
        requestData.longitude
      );
      res.json(store);
    })
  );

  return router;
}
