import { Request, Response, Router } from "express";
import {
  BatchItemTransactionsRequestSchema,
  BatchTankTransactionsRequestSchema,
  CreateItemTransactionRequestSchema,
  CreateTankTransactionRequestSchema,
} from "../dtos/request/inventoryTransactionDTO";
import { asyncHandler } from "../middlewares/async-handler";
import {
  AuthRequest,
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { IInventoryTransactionService } from "../services/inventory";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildInventoryTransactionRouter(
  inventoryTransactionService: IInventoryTransactionService
): Router {
  const router = Router();

  /**
   * @openapi
   * /v1/inventory/transactions/tanks:
   *   post:
   *     summary: Create a tank transaction
   *     description: Creates a transaction to increment or decrement tank quantities for a specific inventory
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTankTransactionRequest'
   *     responses:
   *       201:
   *         description: Tank transaction created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/TankTransactionResult'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or tank type not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/tanks",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = CreateTankTransactionRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.createTankTransaction(
        validatedData,
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /v1/inventory/transactions/items:
   *   post:
   *     summary: Create an item transaction
   *     description: Creates a transaction to increment or decrement item quantities for a specific inventory
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateItemTransactionRequest'
   *     responses:
   *       201:
   *         description: Item transaction created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ItemTransactionResult'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or item not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/items",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = CreateItemTransactionRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.createItemTransaction(
        validatedData,
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /v1/inventory/transactions/tanks/batch:
   *   post:
   *     summary: Process multiple tank transactions
   *     description: Processes multiple tank transactions in a single atomic operation
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BatchTankTransactionsRequest'
   *     responses:
   *       201:
   *         description: Tank transactions processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BatchTransactionResult'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or tank type not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/tanks/batch",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = BatchTankTransactionsRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.processTankTransactions(
        validatedData,
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /v1/inventory/transactions/items/batch:
   *   post:
   *     summary: Process multiple item transactions
   *     description: Processes multiple item transactions in a single atomic operation
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BatchItemTransactionsRequest'
   *     responses:
   *       201:
   *         description: Item transactions processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BatchTransactionResult'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or item not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/items/batch",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = BatchItemTransactionsRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.processItemTransactions(
        validatedData,
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /v1/inventory/transactions/tanks/{inventoryId}/{tankTypeId}/quantities:
   *   get:
   *     summary: Get current tank quantities
   *     description: Retrieves the current quantities of tanks for a specific inventory and tank type
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: inventoryId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the inventory assignment
   *       - in: path
   *         name: tankTypeId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the tank type
   *     responses:
   *       200:
   *         description: Current tank quantities retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/CurrentTankQuantities'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or tank type not found
   *       500:
   *         description: Internal server error
   */
  router.get(
    "/tanks/:inventoryId/:tankTypeId/quantities",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const inventoryId = parseInt(req.params.inventoryId);
      const tankTypeId = parseInt(req.params.tankTypeId);

      if (isNaN(inventoryId) || isNaN(tankTypeId)) {
        return res.status(400).json({
          success: false,
          error: "ID de inventario o tipo de tanque inválido",
        });
      }

      const result = await inventoryTransactionService.getCurrentTankQuantities(
        inventoryId,
        tankTypeId
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /v1/inventory/transactions/items/{inventoryId}/{inventoryItemId}/quantities:
   *   get:
   *     summary: Get current item quantity
   *     description: Retrieves the current quantity of items for a specific inventory and item
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: inventoryId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the inventory assignment
   *       - in: path
   *         name: inventoryItemId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID of the inventory item
   *     responses:
   *       200:
   *         description: Current item quantity retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/CurrentItemQuantity'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       404:
   *         description: Inventory assignment or item not found
   *       500:
   *         description: Internal server error
   */
  router.get(
    "/items/:inventoryId/:inventoryItemId/quantities",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const inventoryId = parseInt(req.params.inventoryId);
      const inventoryItemId = parseInt(req.params.inventoryItemId);

      if (isNaN(inventoryId) || isNaN(inventoryItemId)) {
        return res.status(400).json({
          success: false,
          error: "ID de inventario o artículo inválido",
        });
      }

      const result = await inventoryTransactionService.getCurrentItemQuantity(
        inventoryId,
        inventoryItemId
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  return router;
}