import { Request, Response, Router } from "express";
import {
  CreateInventoryItemRequestSchema,
  CreateTankTypeRequestSchema,
  InventoryItemFiltersRequestSchema,
  ProductSearchRequestSchema,
  TankTypeFiltersRequestSchema,
  UpdateInventoryItemRequestSchema,
  UpdateTankTypeRequestSchema,
} from "../dtos/request/productDTO";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { ProductService } from "../services/productService";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildProductRouter(productService: ProductService) {
  const router = Router();

  // Tank routes
  /**
   * @openapi
   * /products/tanks:
   *   get:
   *     tags: [Products]
   *     summary: Get all tank types
   *     description: Retrieves a list of tank types with optional filtering
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: include_deleted
   *         schema:
   *           type: boolean
   *         description: Include soft-deleted tanks
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in name and description
   *       - in: query
   *         name: weight
   *         schema:
   *           type: string
   *         description: Filter by specific weight
   *       - in: query
   *         name: price_min
   *         schema:
   *           type: number
   *         description: Minimum sell price filter
   *       - in: query
   *         name: price_max
   *         schema:
   *           type: number
   *         description: Maximum sell price filter
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Number of results per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: List of tank types with pagination
   *       400:
   *         description: Invalid query parameters
   */
  router.get(
    "/tanks",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const filters = TankTypeFiltersRequestSchema.parse(req.query);
      const result = await productService.getTanks(filters);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        },
      });
    })
  );

  /**
   * @openapi
   * /products/tanks/{id}:
   *   get:
   *     tags: [Products]
   *     summary: Get tank type by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Tank type details
   *       404:
   *         description: Tank type not found
   */
  router.get(
    "/tanks/:id",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de tipo de tanque inválido",
          },
        });
      }

      const tank = await productService.getTankById(id);
      res.json(tank);
    })
  );

  /**
   * @openapi
   * /products/tanks:
   *   post:
   *     tags: [Products]
   *     summary: Create new tank type
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTankTypeRequest'
   *     responses:
   *       201:
   *         description: Tank type created successfully
   *       400:
   *         description: Invalid request data
   *       409:
   *         description: Tank type name already exists
   */
  router.post(
    "/tanks",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      const data = CreateTankTypeRequestSchema.parse(req.body);
      const tank = await productService.createTank(data);

      res.status(201).json(tank);
    })
  );

  /**
   * @openapi
   * /products/tanks/{id}:
   *   put:
   *     tags: [Products]
   *     summary: Update tank type
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateTankTypeRequest'
   *     responses:
   *       200:
   *         description: Tank type updated successfully
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Tank type not found
   *       409:
   *         description: Tank type name already exists
   */
  router.put(
    "/tanks/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de tipo de tanque inválido",
          },
        });
      }

      const data = UpdateTankTypeRequestSchema.parse(req.body);
      const tank = await productService.updateTank(id, data);

      res.json(tank);
    })
  );

  /**
   * @openapi
   * /products/tanks/{id}:
   *   delete:
   *     tags: [Products]
   *     summary: Soft delete tank type
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Tank type deleted successfully
   *       404:
   *         description: Tank type not found
   *       409:
   *         description: Tank type referenced in orders or inventory
   */
  router.delete(
    "/tanks/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.DELETE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de tipo de tanque inválido",
          },
        });
      }

      await productService.deleteTank(id);

      res.json({
        success: true,
        message: "Tipo de tanque eliminado correctamente",
      });
    })
  );

  /**
   * @openapi
   * /products/tanks/{id}/restore:
   *   patch:
   *     tags: [Products]
   *     summary: Restore soft deleted tank type
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Tank type restored successfully
   *       404:
   *         description: Tank type not found
   *       400:
   *         description: Tank type is not deleted
   *       409:
   *         description: Active tank type with same name already exists
   */
  router.patch(
    "/tanks/:id/restore",
    isAuthenticated,
    requirePermission(ModuleEnum.STORES, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de tipo de tanque inválido",
          },
        });
      }

      const tank = await productService.restoreTank(id);
      res.json(tank);
    })
  );

  // Item routes
  /**
   * @openapi
   * /products/items:
   *   get:
   *     tags: [Products]
   *     summary: Get all inventory items
   *     description: Retrieves a list of inventory items with optional filtering
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: include_deleted
   *         schema:
   *           type: boolean
   *         description: Include soft-deleted items
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in name and description
   *       - in: query
   *         name: price_min
   *         schema:
   *           type: number
   *         description: Minimum sell price filter
   *       - in: query
   *         name: price_max
   *         schema:
   *           type: number
   *         description: Maximum sell price filter
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Number of results per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: List of inventory items with pagination
   *       400:
   *         description: Invalid query parameters
   */
  router.get(
    "/items",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const filters = InventoryItemFiltersRequestSchema.parse(req.query);
      const result = await productService.getItems(filters);

      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
        },
      });
    })
  );

  /**
   * @openapi
   * /products/items/{id}:
   *   get:
   *     tags: [Products]
   *     summary: Get inventory item by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Inventory item details
   *       404:
   *         description: Inventory item not found
   */
  router.get(
    "/items/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de artículo inválido",
          },
        });
      }

      const item = await productService.getItemById(id);
      res.json(item);
    })
  );

  /**
   * @openapi
   * /products/items:
   *   post:
   *     tags: [Products]
   *     summary: Create new inventory item
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInventoryItemRequest'
   *     responses:
   *       201:
   *         description: Inventory item created successfully
   *       400:
   *         description: Invalid request data
   *       409:
   *         description: Item name already exists
   */
  router.post(
    "/items",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      const data = CreateInventoryItemRequestSchema.parse(req.body);
      const item = await productService.createItem(data);

      res.status(201).json(item);
    })
  );

  /**
   * @openapi
   * /products/items/{id}:
   *   put:
   *     tags: [Products]
   *     summary: Update inventory item
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateInventoryItemRequest'
   *     responses:
   *       200:
   *         description: Inventory item updated successfully
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Inventory item not found
   *       409:
   *         description: Item name already exists
   */
  router.put(
    "/items/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de artículo inválido",
          },
        });
      }

      const data = UpdateInventoryItemRequestSchema.parse(req.body);
      const item = await productService.updateItem(id, data);

      res.json(item);
    })
  );

  /**
   * @openapi
   * /products/items/{id}:
   *   delete:
   *     tags: [Products]
   *     summary: Soft delete inventory item
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Inventory item deleted successfully
   *       404:
   *         description: Inventory item not found
   *       409:
   *         description: Item referenced in orders or inventory
   */
  router.delete(
    "/items/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.DELETE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de artículo inválido",
          },
        });
      }

      await productService.deleteItem(id);

      res.json({
        success: true,
        message: "Artículo eliminado correctamente",
      });
    })
  );

  /**
   * @openapi
   * /products/items/{id}/restore:
   *   patch:
   *     tags: [Products]
   *     summary: Restore soft deleted inventory item
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Inventory item restored successfully
   *       404:
   *         description: Inventory item not found
   *       400:
   *         description: Item is not deleted
   *       409:
   *         description: Active item with same name already exists
   */
  router.patch(
    "/items/:id/restore",
    isAuthenticated,
    requirePermission(ModuleEnum.PRODUCTS, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de artículo inválido",
          },
        });
      }

      const item = await productService.restoreItem(id);
      res.json(item);
    })
  );

  // Search route
  /**
   * @openapi
   * /products/search:
   *   get:
   *     tags: [Products]
   *     summary: Search across all products
   *     description: Search for tanks and items by name or description
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Search query term
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [tanks, items, all]
   *         description: Type of products to search
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Search results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 tanks:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/TankType'
   *                 items:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/InventoryItem'
   *                 total_results:
   *                   type: integer
   *       400:
   *         description: Invalid search parameters
   */
  router.get(
    "/search",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { q, type, limit } = ProductSearchRequestSchema.parse(req.query);
      const results = await productService.searchProducts(q, type, limit);

      res.json(results);
    })
  );

  return router;
}
