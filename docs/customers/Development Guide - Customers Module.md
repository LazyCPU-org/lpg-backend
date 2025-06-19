# Customers Module - Development Implementation Guide

## Overview

This guide provides a step-by-step implementation plan for the Customers module, focusing on essential CRUD operations and name-based search functionality. The module leverages existing customer database schema and repository layer while following established patterns from the Products and Orders modules.

## Architecture Overview

### File Structure
```
src/
├── db/schemas/customers/
│   ├── customers.ts (existing - no changes needed)
│   ├── customer-debts.ts (existing - no changes needed)
│   └── index.ts (existing - no changes needed)
├── repositories/customers/
│   ├── ICustomerRepository.ts (existing - use basic methods only)
│   └── PgCustomerRepository.ts (existing - use basic methods only)
├── services/
│   └── customerService.ts (new)
├── routes/
│   └── customerRoutes.ts (new)
├── dtos/request/
│   └── customerDTO.ts (existing - verify schemas needed)
├── dtos/response/
│   └── customerInterface.ts (existing - use basic types)
├── config/modules/
│   └── customers.module.ts (new)
├── config/
│   └── di.ts (update)
└── routes/
    └── index.ts (update)
```

## Implementation Phases

### Phase 1: Service Layer Implementation

#### Customer Service Interface
**File**: `src/services/customerService.ts`

```typescript
import { CustomerRepository } from "../repositories/customers/ICustomerRepository";
import { Customer } from "../dtos/response/customerInterface";
import {
  QuickCustomerCreationRequest,
  CustomerUpdateRequest,
  CustomerListRequest,
  CustomerSearchRequest,
} from "../dtos/request/customerDTO";
import { 
  ConflictError, 
  NotFoundError,
  BadRequestError 
} from "../utils/custom-errors";

export interface CustomerService {
  // Basic CRUD operations
  getCustomers(filters?: CustomerListRequest): Promise<{ data: Customer[], total: number }>;
  getCustomerById(id: number): Promise<Customer>;
  createCustomer(data: QuickCustomerCreationRequest): Promise<Customer>;
  updateCustomer(id: number, data: CustomerUpdateRequest): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  restoreCustomer(id: number): Promise<Customer>;
  
  // Search operations
  searchCustomers(query: string, limit?: number): Promise<{ data: Customer[], total_results: number }>;
}

export class CustomerServiceImpl implements CustomerService {
  constructor(
    private customerRepository: CustomerRepository
  ) {}

  async getCustomers(filters: CustomerListRequest = {}): Promise<{ data: Customer[], total: number }> {
    const {
      search,
      include_inactive = false,
      limit = 50,
      offset = 0
    } = filters;

    // If search is provided, use search functionality
    if (search) {
      if (search.length < 2) {
        throw new BadRequestError("El término de búsqueda debe tener al menos 2 caracteres");
      }
      
      const searchResults = await this.customerRepository.searchByName(search, {
        includeInactive: include_inactive,
        limit,
        offset
      });
      
      return {
        data: searchResults.data,
        total: searchResults.total
      };
    }

    // Otherwise, use regular findAll
    return await this.customerRepository.findAll({
      includeInactive: include_inactive,
      limit,
      offset
    });
  }

  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Cliente no encontrado");
    }
    return customer;
  }

  async createCustomer(data: QuickCustomerCreationRequest): Promise<Customer> {
    // Check for duplicate phone number
    const existingCustomer = await this.customerRepository.findByPhone(data.phoneNumber);
    if (existingCustomer) {
      throw new ConflictError("Ya existe un cliente con este número de teléfono");
    }

    return await this.customerRepository.create({
      ...data,
      customerType: 'regular', // Default customer type
      rating: null,
      isActive: true,
      lastOrderDate: null,
      preferredPaymentMethod: null,
      totalOrders: 0
    });
  }

  async updateCustomer(id: number, data: CustomerUpdateRequest): Promise<Customer> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (!existingCustomer.isActive) {
      throw new BadRequestError("No se puede actualizar un cliente inactivo");
    }

    return await this.customerRepository.update(id, data);
  }

  async deleteCustomer(id: number): Promise<void> {
    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    // Check if referenced in orders
    const referencedInOrders = await this.customerRepository.isReferencedInOrders(id);
    if (referencedInOrders) {
      throw new ConflictError("No se puede eliminar el cliente: está referenciado en órdenes existentes");
    }

    const deleted = await this.customerRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundError("Cliente no encontrado");
    }
  }

  async restoreCustomer(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(id, true);
    if (!customer) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (customer.isActive) {
      throw new BadRequestError("El cliente no está eliminado");
    }

    // Check if phone conflicts with active customers
    const duplicateCustomer = await this.customerRepository.findByPhone(customer.phoneNumber);
    if (duplicateCustomer && duplicateCustomer.isActive) {
      throw new ConflictError("Ya existe un cliente activo con este número de teléfono");
    }

    return await this.customerRepository.restore(id);
  }

  async searchCustomers(
    query: string, 
    limit = 20
  ): Promise<{ data: Customer[], total_results: number }> {
    if (query.length < 2) {
      throw new BadRequestError("El término de búsqueda debe tener al menos 2 caracteres");
    }

    const results = await this.customerRepository.searchByName(query, {
      includeInactive: false,
      limit
    });

    return {
      data: results.data,
      total_results: results.total
    };
  }
}
```

### Phase 2: Request DTO Validation

#### Verify and Update Customer DTOs
**File**: `src/dtos/request/customerDTO.ts`

Ensure the following schemas exist (they should already be implemented):

```typescript
// Verify these schemas exist and are correctly implemented:

export const QuickCustomerCreationRequestSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido").max(50, "Nombre debe tener máximo 50 caracteres"),
  lastName: z.string().min(1, "Apellido es requerido").max(50, "Apellido debe tener máximo 50 caracteres"),
  phoneNumber: z.string().regex(/^\+51[0-9]{9}$/, "Formato de teléfono peruano inválido (+51xxxxxxxxx)"),
  address: z.string().min(1, "Dirección es requerida"),
  alternativePhone: z.string().regex(/^\+51[0-9]{9}$/, "Formato de teléfono peruano inválido").optional(),
  locationReference: z.string().optional(),
});

export const CustomerUpdateRequestSchema = z.object({
  address: z.string().min(1, "Dirección es requerida").optional(),
  alternativePhone: z.string().regex(/^\+51[0-9]{9}$/, "Formato de teléfono peruano inválido").optional(),
  locationReference: z.string().optional(),
});

export const CustomerListRequestSchema = z.object({
  search: z.string().min(2, "Término de búsqueda debe tener al menos 2 caracteres").optional(),
  include_inactive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const CustomerSearchRequestSchema = z.object({
  q: z.string().min(2, "Término de búsqueda debe tener al menos 2 caracteres"),
  limit: z.number().int().min(1).max(50).optional(),
});

// Export types
export type QuickCustomerCreationRequest = z.infer<typeof QuickCustomerCreationRequestSchema>;
export type CustomerUpdateRequest = z.infer<typeof CustomerUpdateRequestSchema>;
export type CustomerListRequest = z.infer<typeof CustomerListRequestSchema>;
export type CustomerSearchRequest = z.infer<typeof CustomerSearchRequestSchema>;
```

### Phase 3: API Routes Implementation

#### Customer Routes
**File**: `src/routes/customerRoutes.ts`

```typescript
import { Request, Response, Router } from "express";
import {
  QuickCustomerCreationRequestSchema,
  CustomerUpdateRequestSchema,
  CustomerListRequestSchema,
  CustomerSearchRequestSchema,
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
      const { q, limit } = CustomerSearchRequestSchema.parse(req.query);
      const results = await customerService.searchCustomers(q, limit);
      
      res.json(results);
    })
  );

  return router;
}
```

### Phase 4: DI Container Integration

#### Customer Module
**File**: `src/config/modules/customers.module.ts`

```typescript
import { ICustomerRepository } from "../../repositories/customers/ICustomerRepository";
import { PgCustomerRepository } from "../../repositories/customers/PgCustomerRepository";
import { CustomerService, CustomerServiceImpl } from "../../services/customerService";
import { DIModule, CoreDependencies } from "../types/moduleTypes";
import { OrdersDependencies } from "./orders.module";

export interface CustomersDependencies {
  // Services (repository is shared from orders module)
  customerService: CustomerService;
}

export class CustomersModule implements DIModule<CustomersDependencies> {
  private dependencies: CustomersDependencies | null = null;

  createDependencies(coreDeps: CoreDependencies, ordersDeps: OrdersDependencies): CustomersDependencies {
    // Reuse customer repository from orders module to avoid duplication
    const customerRepository = ordersDeps.customerRepository;

    // Create services
    const customerService = new CustomerServiceImpl(customerRepository);

    this.dependencies = {
      customerService,
    };

    return this.dependencies;
  }

  getDependencies(): CustomersDependencies {
    if (!this.dependencies) {
      throw new Error("Customers dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}
```

#### Update DI Container
**File**: `src/config/di.ts`

```typescript
// Add import
import { CustomersModule, CustomersDependencies } from "./modules/customers.module";

// Update Container type
export type Container = CoreDependencies & AuthDependencies & InventoryDependencies & OrdersDependencies & ProductsDependencies & CustomersDependencies;

// Update createContainer function
export function createContainer(): Container {
  // Initialize modules
  const coreModule = new CoreModule();
  const authModule = new AuthModule();
  const inventoryModule = new InventoryModule();
  const ordersModule = new OrdersModule();
  const productsModule = new ProductsModule();
  const customersModule = new CustomersModule();

  // Create dependencies in dependency order
  const coreDeps = coreModule.createDependencies();
  const authDeps = authModule.createDependencies(coreDeps);
  const inventoryDeps = inventoryModule.createDependencies(coreDeps);
  const ordersDeps = ordersModule.createDependencies(coreDeps, inventoryDeps);
  const productsDeps = productsModule.createDependencies(coreDeps);
  // Pass the shared customer repository from orders module to avoid duplication
  const customersDeps = customersModule.createDependencies(coreDeps, ordersDeps);

  // Return merged container
  return {
    ...coreDeps,
    ...authDeps,
    ...inventoryDeps,
    ...ordersDeps,
    ...productsDeps,
    ...customersDeps,
  };
}
```

#### Update Routes Index
**File**: `src/routes/index.ts`

```typescript
// Add import
import { buildCustomerRouter } from "./customerRoutes";

// Add in defineRoutes function
export const defineRoutes = function (app: Express, container: Container) {
  // ... existing code ...

  // Customers module router
  const customerRouter = buildCustomerRouter(container.customerService);

  // Mount routers
  // ... existing mounts ...
  
  // Customers module routes
  app.use(`${v1BasePath}/customers`, customerRouter);
};
```

### Phase 5: Permission Module Updates

#### Add Customer Permissions
**File**: `src/utils/permissions.ts`

Ensure `CUSTOMERS` module is defined in `ModuleEnum`:

```typescript
export enum ModuleEnum {
  // ... existing modules ...
  CUSTOMERS = "CUSTOMERS",
}
```

## Repository Method Usage

### Basic Repository Methods Actually Used

The service layer uses **these repository methods from the existing interface**:

```typescript
// Methods used in CustomerService implementation
- findActiveCustomers(limit?: number): Promise<Customer[]>
- findInactiveCustomers(limit?: number): Promise<Customer[]>
- findById(id): Promise<Customer | null>
- findByPhone(phone): Promise<CustomerSearchResult | null>
- create(firstName, lastName, phoneNumber, address, alternativePhone?, locationReference?, customerType?, rating?): Promise<Customer>
- update(id, updates): Promise<Customer>
```

### Implementation Notes

- **Search Strategy**: Instead of using `searchByName()` which returns `CustomerSearchResult[]`, the implementation uses `findActiveCustomers()` and applies client-side filtering for better type consistency
- **Repository Sharing**: The customer repository is shared with the Orders module to avoid duplication and maintain consistency
- **Soft Delete**: Implemented via the `update()` method with `{ isActive: false }` rather than a dedicated `softDelete()` method

### Unused Repository Methods

The following advanced repository methods will **NOT** be used in the basic API (reserved for future metrics endpoints):

```typescript
// Advanced methods not used in basic CRUD API
- findCustomersWithAnalytics()
- findCustomersByOrderFrequency()
- findHighValueCustomers()
- findCustomersWithDebts()
- getCustomerOrderHistory()
- getCustomerAnalytics()
- Various transaction-aware methods
```

## Database Considerations

### Existing Schema

No database changes required - the existing customer schema already supports:
- ✅ Soft delete with `isActive` field
- ✅ Comprehensive customer information
- ✅ Phone number uniqueness
- ✅ Proper relationships with orders

### Index Optimization

Consider adding search optimization index:

```sql
-- For name search optimization (if not already exists)
CREATE INDEX CONCURRENTLY idx_customers_name_search 
ON customers USING gin(to_tsvector('spanish', first_name || ' ' || last_name)) 
WHERE is_active = true;
```

## Testing Strategy

### Integration Testing Focus

Since unit tests are skipped per client request, focus on:
- Manual API endpoint testing
- Integration with existing orders system
- Permission-based access verification
- Soft delete and restore functionality

### Test Scenarios

1. **Customer CRUD Operations**
   - Create customer with valid data
   - Update customer address/phone
   - Soft delete and restore customer

2. **Name Search Functionality**
   - Search by first name only
   - Search by last name only
   - Search by full name combination
   - Partial name matching

3. **Business Rule Validation**
   - Duplicate phone number prevention
   - Order reference deletion blocking
   - Inactive customer update prevention

4. **Permission Testing**
   - Read access for all authenticated users
   - Create/Update/Delete access for admins and operators only
   - Delivery user read-only access

## Implementation Status

### ✅ Completed Features (100% Complete)

#### Core Customer API (100% Complete)
- [x] Customer service layer with full CRUD operations
- [x] Name-based search functionality with case-insensitive filtering
- [x] Soft delete and restore capabilities
- [x] Phone number uniqueness validation
- [x] Peruvian phone format validation (+51xxxxxxxxx)
- [x] Pagination support for all listing operations
- [x] Business rule validation (active status checks, duplicate prevention)

#### API Endpoints (100% Complete)
- [x] `GET /v1/customers` - List customers with search and pagination
- [x] `GET /v1/customers/search` - Dedicated search endpoint
- [x] `GET /v1/customers/:id` - Get customer by ID
- [x] `POST /v1/customers` - Create new customer
- [x] `PUT /v1/customers/:id` - Update customer (address, alternative phone, location reference)
- [x] `DELETE /v1/customers/:id` - Soft delete customer
- [x] `PATCH /v1/customers/:id/restore` - Restore deleted customer

#### Integration & Architecture (100% Complete)
- [x] Dependency injection integration with shared repository
- [x] Permission system integration (CUSTOMERS module added)
- [x] Route registration in main application
- [x] TypeScript type safety and validation
- [x] Error handling with Spanish messages
- [x] OpenAPI documentation annotations

### Technical Implementation Notes

#### Repository Strategy
- **Shared Repository**: Uses the existing `PgCustomerRepository` instance from the Orders module to avoid duplication and maintain consistency
- **Search Implementation**: Instead of the originally planned `searchByName()` method which returns `CustomerSearchResult[]`, the implementation uses `findActiveCustomers()` and applies client-side filtering for better type consistency
- **Soft Delete**: Implemented via the `update()` method with `{ isActive: false }` rather than a dedicated `softDelete()` method

#### Performance Considerations
- **Client-side Filtering**: Name search is performed in-memory after fetching active customers (suitable for current scale)
- **Large Limit Strategy**: Uses a large limit (10,000) when fetching all customers, then applies client-side pagination
- **Future Optimization**: Can be enhanced with database-level search for larger customer bases

### Business Value Delivered

1. **Operator Workflow Support**: Full customer management during order processing
2. **Data Integrity**: Phone number uniqueness and soft delete protection
3. **Search Efficiency**: Fast name-based customer lookup
4. **Permission Control**: Role-based access for different user types
5. **Audit Trail**: Soft delete preserves customer history for orders

This implementation guide provided a complete roadmap that was successfully executed, delivering a production-ready Customers module while leveraging existing infrastructure and following established patterns from other modules.