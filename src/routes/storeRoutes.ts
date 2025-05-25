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
   *           - Comma-separated: `assignments,catalog,inventory`
   *           - JSON format: `{"assignments":true,"catalog":true,"inventory":true}`
   *
   *           Available relations:
   *           - `assignments`: Include assigned users to this store
   *           - `catalog`: Include store's product catalog (tanks and items available for sale)
   *           - `inventory`: Include current day's inventory status for each assigned user
   *
   *           **Note**: `inventory` relation automatically includes `assignments` data.
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
        assignments: Boolean(req.includeRelations.assignments),
        catalog: Boolean(req.includeRelations.catalog),
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
   *     description: |
   *       Creates a new store and automatically initializes its product catalog with all available tanks and items.
   *       The catalog can be customized later by deactivating unwanted products.
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
   *                 minLength: 4
   *                 description: Unique store name
   *               address:
   *                 type: string
   *                 description: Physical address of the store
   *               latitude:
   *                 type: string
   *                 description: Geographic latitude (-90 to 90)
   *               longitude:
   *                 type: string
   *                 description: Geographic longitude (-180 to 180)
   *               phoneNumber:
   *                 type: string
   *                 description: Contact phone number
   *               mapsUrl:
   *                 type: string
   *                 description: Google Maps URL for store location
   *     responses:
   *       200:
   *         description: Store created successfully with initialized catalog
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Store'
   *       400:
   *         description: Invalid request data or store name already exists
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
   * /stores/{id}/catalog:
   *   get:
   *     tags: [Stores]
   *     summary: Get store catalog
   *     description: Retrieves the complete product catalog for a specific store, including tanks and items with their pricing and availability
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Store ID
   *     responses:
   *       200:
   *         description: Store catalog with tanks and items
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tanks:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/StoreCatalogTank'
   *                 items:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/StoreCatalogItem'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store not found
   */
  router.get(
    "/:id/catalog",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = parseInt(req.params.id);
      const catalog = await storeService.getStoreCatalog(storeId);
      res.json(catalog);
    })
  );

  /**
   * @openapi
   * /stores/{id}/catalog/initialize:
   *   post:
   *     tags: [Stores]
   *     summary: Initialize store catalog
   *     description: |
   *       Manually initializes or reinitializes the product catalog for a store.
   *       This adds all available tanks and items that are not already in the store's catalog.
   *       Useful for adding new products to existing stores.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Store ID
   *     responses:
   *       200:
   *         description: Catalog initialized successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Catálogo de tienda inicializado correctamente"
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/:id/catalog/initialize",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const storeId = parseInt(req.params.id);
      await storeService.initializeStoreCatalog(storeId);
      res.json({
        success: true,
        message: "Catálogo de tienda inicializado correctamente",
      });
    })
  );

  /**
   * @openapi
   * /stores/assignment:
   *   post:
   *     tags: [Stores]
   *     summary: Create a new store assignment
   *     description: Assigns a user to a store. A user can only be assigned to one store at a time.
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
   *                 description: ID of the store to assign the user to
   *               userId:
   *                 type: integer
   *                 description: ID of the user to assign
   *     responses:
   *       200:
   *         description: Assignment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StoreAssignment'
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Store or user not found
   *       409:
   *         description: User already assigned to another store
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
   *     description: Updates the geographic coordinates of a store
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
   *                 description: Geographic latitude (-90 to 90)
   *               longitude:
   *                 type: string
   *                 description: Geographic longitude (-180 to 180)
   *     responses:
   *       200:
   *         description: Store location updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Store'
   *       400:
   *         description: Invalid coordinates
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
