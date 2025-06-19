import { Request, Response, Router } from "express";
import {
  QuickCustomerCreationRequestSchema,
  CustomerUpdateRequestSchema,
  CustomerListRequestSchema,
  CustomerSearchRequestSchemaV2,
} from "../dtos/request/customerDTO";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { CustomerService } from "../services/customerService";
import { ActionEnum, ModuleEnum } from "../utils/permissions";

export function buildCustomerRouter(customerService: CustomerService) {
  const router = Router();

  /**
   * @openapi
   * /customers:
   *   get:
   *     tags: [Customers]
   *     summary: Get all customers
   *     description: Retrieves a paginated list of customers with optional name search
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           minLength: 2
   *         description: Search in customer names (firstName + lastName)
   *       - in: query
   *         name: include_inactive
   *         schema:
   *           type: boolean
   *         description: Include soft-deleted customers
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
   *         description: List of customers with pagination
   *       400:
   *         description: Invalid query parameters
   */
  router.get(
    "/",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const filters = CustomerListRequestSchema.parse(req.query);
      const result = await customerService.getCustomers(filters);
      
      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0
        }
      });
    })
  );

  /**
   * @openapi
   * /customers/search:
   *   get:
   *     tags: [Customers]
   *     summary: Search customers by name
   *     description: Search for customers by firstName + lastName combination
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *           minLength: 2
   *         description: Search query term for customer names
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
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Customer'
   *                 total_results:
   *                   type: integer
   *       400:
   *         description: Invalid search parameters
   */
  router.get(
    "/search",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const { q, limit } = CustomerSearchRequestSchemaV2.parse(req.query);
      const results = await customerService.searchCustomers(q, limit);
      
      res.json(results);
    })
  );

  /**
   * @openapi
   * /customers/{id}:
   *   get:
   *     tags: [Customers]
   *     summary: Get customer by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Customer details
   *       404:
   *         description: Customer not found
   */
  router.get(
    "/:id",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de cliente inválido"
          }
        });
      }
      
      const customer = await customerService.getCustomerById(id);
      res.json(customer);
    })
  );

  /**
   * @openapi
   * /customers:
   *   post:
   *     tags: [Customers]
   *     summary: Create new customer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/QuickCustomerCreationRequest'
   *     responses:
   *       201:
   *         description: Customer created successfully
   *       400:
   *         description: Invalid request data
   *       409:
   *         description: Phone number already exists
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.CUSTOMERS, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      const data = QuickCustomerCreationRequestSchema.parse(req.body);
      const customer = await customerService.createCustomer(data);
      
      res.status(201).json(customer);
    })
  );

  /**
   * @openapi
   * /customers/{id}:
   *   put:
   *     tags: [Customers]
   *     summary: Update customer
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
   *             $ref: '#/components/schemas/CustomerUpdateRequest'
   *     responses:
   *       200:
   *         description: Customer updated successfully
   *       400:
   *         description: Invalid request data
   *       404:
   *         description: Customer not found
   */
  router.put(
    "/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.CUSTOMERS, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de cliente inválido"
          }
        });
      }
      
      const data = CustomerUpdateRequestSchema.parse(req.body);
      const customer = await customerService.updateCustomer(id, data);
      
      res.json(customer);
    })
  );

  /**
   * @openapi
   * /customers/{id}:
   *   delete:
   *     tags: [Customers]
   *     summary: Soft delete customer
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Customer deleted successfully
   *       404:
   *         description: Customer not found
   *       409:
   *         description: Customer referenced in orders
   */
  router.delete(
    "/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.CUSTOMERS, ActionEnum.DELETE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de cliente inválido"
          }
        });
      }
      
      await customerService.deleteCustomer(id);
      
      res.json({
        success: true,
        message: "Cliente eliminado correctamente"
      });
    })
  );

  /**
   * @openapi
   * /customers/{id}/restore:
   *   patch:
   *     tags: [Customers]
   *     summary: Restore soft deleted customer
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Customer restored successfully
   *       404:
   *         description: Customer not found
   *       400:
   *         description: Customer is not deleted
   *       409:
   *         description: Active customer with same phone already exists
   */
  router.patch(
    "/:id/restore",
    isAuthenticated,
    requirePermission(ModuleEnum.CUSTOMERS, ActionEnum.UPDATE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "ID de cliente inválido"
          }
        });
      }
      
      const customer = await customerService.restoreCustomer(id);
      res.json(customer);
    })
  );

  return router;
}