import { Request, Response, Router } from "express";
import {
  BatchItemTransactionsRequestSchema,
  BatchTankTransactionsRequestSchema,
  ItemTransactionRequestSchema,
  TankTransactionRequestSchema,
} from "../dtos/request/transactionDTO";
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
   * /inventory/transactions/tanks:
   *   post:
   *     summary: Create a tank transaction
   *     description: Creates a business-level tank transaction (sale, purchase, return, etc.) with automatic validation
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TankTransactionRequest'
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
   *                   $ref: '#/components/schemas/TankTransactionResponse'
   *       400:
   *         description: Invalid request data or business rule violation
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
      const validatedData = TankTransactionRequestSchema.parse(req.body);
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
   * /inventory/transactions/items:
   *   post:
   *     summary: Create an item transaction
   *     description: Creates a business-level item transaction (sale, purchase, return, etc.) with automatic validation
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ItemTransactionRequest'
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
   *                   $ref: '#/components/schemas/ItemTransactionResponse'
   *       400:
   *         description: Invalid request data or business rule violation
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
      const validatedData = ItemTransactionRequestSchema.parse(req.body);
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
   * /inventory/transactions/tanks/batch:
   *   post:
   *     summary: Process multiple tank transactions
   *     description: Processes multiple business-level tank transactions with individual validation
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
   *         description: Tank transactions processed (may include partial failures)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BatchTransactionResponse'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
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

      const result =
        await inventoryTransactionService.processBatchTankTransactions(
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
   * /inventory/transactions/items/batch:
   *   post:
   *     summary: Process multiple item transactions
   *     description: Processes multiple business-level item transactions with individual validation
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
   *         description: Item transactions processed (may include partial failures)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/BatchTransactionResponse'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
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

      const result =
        await inventoryTransactionService.processBatchItemTransactions(
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
   * /inventory/transactions/tanks/validate:
   *   post:
   *     summary: Validate tank transaction
   *     description: Validates a tank transaction without executing it, returns calculated changes
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TankTransactionRequest'
   *     responses:
   *       200:
   *         description: Transaction validation result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/TransactionValidationResponse'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/tanks/validate",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = TankTransactionRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.validateTankTransaction(
        validatedData,
        userId
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /inventory/transactions/items/validate:
   *   post:
   *     summary: Validate item transaction
   *     description: Validates an item transaction without executing it, returns calculated changes
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ItemTransactionRequest'
   *     responses:
   *       200:
   *         description: Transaction validation result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/TransactionValidationResponse'
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.post(
    "/items/validate",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const validatedData = ItemTransactionRequestSchema.parse(req.body);
      const userId = parseInt(req.user!.id);

      const result = await inventoryTransactionService.validateItemTransaction(
        validatedData,
        userId
      );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  /**
   * @openapi
   * /inventory/transactions/types/{entityType}:
   *   get:
   *     summary: Get supported transaction types
   *     description: Returns all supported transaction types for tanks or items with documentation
   *     tags: [Inventory Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: entityType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [tank, item]
   *         description: Type of entity (tank or item)
   *     responses:
   *       200:
   *         description: Supported transaction types retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SupportedTransactionsResponse'
   *       400:
   *         description: Invalid entity type
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.get(
    "/types/:entityType",
    isAuthenticated,
    requirePermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    asyncHandler(async (req: Request, res: Response) => {
      const entityType = req.params.entityType as "tank" | "item";

      if (!["tank", "item"].includes(entityType)) {
        return res.status(400).json({
          success: false,
          error: "Tipo de entidad inválido. Debe ser 'tank' o 'item'",
        });
      }

      const result =
        await inventoryTransactionService.getSupportedTransactionTypes(
          entityType
        );

      res.json({
        success: true,
        data: result,
      });
    })
  );

  return router;
}
