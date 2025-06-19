# Products Module - Development Implementation Guide

## Overview

This guide provides a step-by-step implementation plan for the Products module, following the established patterns in the LPG delivery backend system. The module will provide CRUD operations and search functionality for tank types and inventory items.

## Architecture Overview

### File Structure
```
src/
├── db/schemas/
│   ├── inventory/
│   │   ├── tank-type.ts (update with soft delete)
│   │   └── inventory-item.ts (update with soft delete)
├── repositories/
│   ├── tankTypeRepository.ts (new)
│   └── inventoryItemRepository.ts (new)
├── services/
│   └── productService.ts (new)
├── controllers/
│   └── productController.ts (new)
├── routes/
│   └── productRoutes.ts (new)
├── dtos/
│   ├── request/
│   │   ├── tankTypeRequests.ts (new)
│   │   └── inventoryItemRequests.ts (new)
│   └── response/
│   │   ├── tankTypeResponses.ts (new)
│   │   └── inventoryItemResponses.ts (new)
├── validators/
│   ├── tankTypeValidator.ts (new)
│   └── inventoryItemValidator.ts (new)
└── tests/
    ├── repositories/
    │   ├── tankTypeRepository.test.ts (new)
    │   └── inventoryItemRepository.test.ts (new)
    ├── services/
    │   └── productService.test.ts (new)
    └── controllers/
        └── productController.test.ts (new)
```

## Implementation Phases

### Phase 1: Database Schema Updates

#### Update Tank Type Schema
**File**: `src/db/schemas/inventory/tank-type.ts`

```typescript
// Add soft delete columns
export const tankType = pgTable("tank_type", {
  typeId: serial("type_id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  weight: varchar("weight", { length: 5 }).notNull(),
  description: text("description"),
  purchase_price: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  scale: varchar("scale", { length: 10 }).notNull().default("unidad"),
  is_active: boolean("is_active").default(true),
  deleted_at: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Update Zod schemas
export const insertTankTypeSchema = createInsertSchema(tankType, {
  purchase_price: z.coerce.number().positive(),
  sell_price: z.coerce.number().positive(),
}).refine((data) => data.sell_price > data.purchase_price, {
  message: "Sell price must be greater than purchase price",
  path: ["sell_price"],
});

export const selectTankTypeSchema = createSelectSchema(tankType);
export const updateTankTypeSchema = insertTankTypeSchema.partial();
```

#### Update Inventory Item Schema
**File**: `src/db/schemas/inventory/inventory-item.ts`

```typescript
// Add soft delete columns
export const inventoryItem = pgTable("inventory_item", {
  inventoryItemId: serial("inventory_item_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  purchase_price: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  sell_price: decimal("sell_price", { precision: 10, scale: 2 }).notNull(),
  scale: varchar("scale", { length: 10 }).notNull(),
  is_active: boolean("is_active").default(true),
  deleted_at: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Update Zod schemas
export const insertInventoryItemSchema = createInsertSchema(inventoryItem, {
  purchase_price: z.coerce.number().positive(),
  sell_price: z.coerce.number().positive(),
}).refine((data) => data.sell_price > data.purchase_price, {
  message: "Sell price must be greater than purchase price",
  path: ["sell_price"],
});

export const selectInventoryItemSchema = createSelectSchema(inventoryItem);
export const updateInventoryItemSchema = insertInventoryItemSchema.partial();
```

### Phase 2: Repository Layer

#### Tank Type Repository
**File**: `src/repositories/tankTypeRepository.ts`

```typescript
import { db } from "@/db/drizzle";
import { tankType, insertTankTypeSchema, updateTankTypeSchema } from "@/db/schemas/inventory/tank-type";
import { eq, and, ilike, isNull, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

export interface TankTypeFilters {
  includeDeleted?: boolean;
  search?: string;
  weight?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

export interface TankTypeRepository {
  findAll(filters?: TankTypeFilters): Promise<{ data: any[], total: number }>;
  findById(id: number, includeDeleted?: boolean): Promise<any | null>;
  findByName(name: string, excludeId?: number): Promise<any | null>;
  create(data: z.infer<typeof insertTankTypeSchema>): Promise<any>;
  update(id: number, data: z.infer<typeof updateTankTypeSchema>): Promise<any>;
  softDelete(id: number): Promise<boolean>;
  restore(id: number): Promise<any>;
  isReferencedInOrders(id: number): Promise<boolean>;
  isReferencedInInventory(id: number): Promise<boolean>;
}

export const tankTypeRepository: TankTypeRepository = {
  async findAll(filters = {}) {
    const {
      includeDeleted = false,
      search,
      weight,
      priceMin,
      priceMax,
      limit = 50,
      offset = 0
    } = filters;

    let query = db.select().from(tankType);
    
    const conditions = [];
    
    if (!includeDeleted) {
      conditions.push(eq(tankType.is_active, true));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(tankType.name, `%${search}%`),
          ilike(tankType.description, `%${search}%`)
        )
      );
    }
    
    if (weight) {
      conditions.push(eq(tankType.weight, weight));
    }
    
    if (priceMin !== undefined) {
      conditions.push(gte(tankType.sell_price, priceMin.toString()));
    }
    
    if (priceMax !== undefined) {
      conditions.push(lte(tankType.sell_price, priceMax.toString()));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const [data, countResult] = await Promise.all([
      query
        .orderBy(desc(tankType.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(tankType).where(and(...conditions))
    ]);
    
    return {
      data,
      total: countResult[0]?.count ?? 0
    };
  },

  async findById(id: number, includeDeleted = false) {
    const conditions = [eq(tankType.typeId, id)];
    
    if (!includeDeleted) {
      conditions.push(eq(tankType.is_active, true));
    }
    
    const result = await db.select()
      .from(tankType)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  },

  async findByName(name: string, excludeId?: number) {
    const conditions = [
      eq(tankType.name, name),
      eq(tankType.is_active, true)
    ];
    
    if (excludeId) {
      conditions.push(ne(tankType.typeId, excludeId));
    }
    
    const result = await db.select()
      .from(tankType)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  },

  async create(data: z.infer<typeof insertTankTypeSchema>) {
    const result = await db.insert(tankType)
      .values({
        ...data,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    return result[0];
  },

  async update(id: number, data: z.infer<typeof updateTankTypeSchema>) {
    const result = await db.update(tankType)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(tankType.typeId, id))
      .returning();
      
    return result[0];
  },

  async softDelete(id: number) {
    const result = await db.update(tankType)
      .set({
        is_active: false,
        deleted_at: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tankType.typeId, id))
      .returning();
      
    return result.length > 0;
  },

  async restore(id: number) {
    const result = await db.update(tankType)
      .set({
        is_active: true,
        deleted_at: null,
        updatedAt: new Date()
      })
      .where(eq(tankType.typeId, id))
      .returning();
      
    return result[0];
  },

  async isReferencedInOrders(id: number) {
    // Check if tank type is referenced in any orders
    // Implementation depends on orders schema
    return false; // Placeholder
  },

  async isReferencedInInventory(id: number) {
    // Check if tank type is referenced in current inventory
    // Implementation depends on inventory assignments
    return false; // Placeholder
  }
};
```

#### Inventory Item Repository
**File**: `src/repositories/inventoryItemRepository.ts`

Similar structure to `tankTypeRepository` but for inventory items.

### Phase 3: Service Layer

#### Product Service
**File**: `src/services/productService.ts`

```typescript
import { tankTypeRepository, TankTypeRepository, TankTypeFilters } from "@/repositories/tankTypeRepository";
import { inventoryItemRepository, InventoryItemRepository, InventoryItemFilters } from "@/repositories/inventoryItemRepository";
import { z } from "zod";
import { insertTankTypeSchema, updateTankTypeSchema } from "@/db/schemas/inventory/tank-type";
import { insertInventoryItemSchema, updateInventoryItemSchema } from "@/db/schemas/inventory/inventory-item";

export interface ProductService {
  // Tank Types
  getTankTypes(filters?: TankTypeFilters): Promise<{ data: any[], total: number }>;
  getTankTypeById(id: number): Promise<any>;
  createTankType(data: z.infer<typeof insertTankTypeSchema>): Promise<any>;
  updateTankType(id: number, data: z.infer<typeof updateTankTypeSchema>): Promise<any>;
  deleteTankType(id: number): Promise<void>;
  restoreTankType(id: number): Promise<any>;
  
  // Inventory Items
  getInventoryItems(filters?: InventoryItemFilters): Promise<{ data: any[], total: number }>;
  getInventoryItemById(id: number): Promise<any>;
  createInventoryItem(data: z.infer<typeof insertInventoryItemSchema>): Promise<any>;
  updateInventoryItem(id: number, data: z.infer<typeof updateInventoryItemSchema>): Promise<any>;
  deleteInventoryItem(id: number): Promise<void>;
  restoreInventoryItem(id: number): Promise<any>;
  
  // Search
  searchProducts(query: string, type?: 'tanks' | 'items' | 'all', limit?: number): Promise<any>;
}

export const productService: ProductService = {
  // Tank Types Implementation
  async getTankTypes(filters) {
    return await tankTypeRepository.findAll(filters);
  },

  async getTankTypeById(id: number) {
    const tankType = await tankTypeRepository.findById(id);
    if (!tankType) {
      throw new Error("Tank type not found");
    }
    return tankType;
  },

  async createTankType(data) {
    // Check for duplicate name
    const existing = await tankTypeRepository.findByName(data.name);
    if (existing) {
      throw new Error("Tank type with this name already exists");
    }
    
    // Validate business rules
    if (data.sell_price <= data.purchase_price) {
      throw new Error("Sell price must be greater than purchase price");
    }
    
    return await tankTypeRepository.create(data);
  },

  async updateTankType(id: number, data) {
    // Check if tank type exists
    const existing = await tankTypeRepository.findById(id);
    if (!existing) {
      throw new Error("Tank type not found");
    }
    
    // Check for duplicate name (excluding current)
    if (data.name) {
      const duplicate = await tankTypeRepository.findByName(data.name, id);
      if (duplicate) {
        throw new Error("Tank type with this name already exists");
      }
    }
    
    // Validate business rules if prices are being updated
    const finalSellPrice = data.sell_price ?? existing.sell_price;
    const finalPurchasePrice = data.purchase_price ?? existing.purchase_price;
    
    if (Number(finalSellPrice) <= Number(finalPurchasePrice)) {
      throw new Error("Sell price must be greater than purchase price");
    }
    
    return await tankTypeRepository.update(id, data);
  },

  async deleteTankType(id: number) {
    // Check if tank type exists
    const existing = await tankTypeRepository.findById(id);
    if (!existing) {
      throw new Error("Tank type not found");
    }
    
    // Check if referenced in orders or inventory
    const [referencedInOrders, referencedInInventory] = await Promise.all([
      tankTypeRepository.isReferencedInOrders(id),
      tankTypeRepository.isReferencedInInventory(id)
    ]);
    
    if (referencedInOrders || referencedInInventory) {
      throw new Error("Cannot delete tank type: it is referenced in orders or inventory");
    }
    
    await tankTypeRepository.softDelete(id);
  },

  async restoreTankType(id: number) {
    const tankType = await tankTypeRepository.findById(id, true);
    if (!tankType) {
      throw new Error("Tank type not found");
    }
    
    if (tankType.is_active) {
      throw new Error("Tank type is not deleted");
    }
    
    return await tankTypeRepository.restore(id);
  },

  // Similar implementation for inventory items...
  
  async searchProducts(query: string, type = 'all', limit = 20) {
    const results: any = {};
    
    if (type === 'tanks' || type === 'all') {
      const tankResults = await tankTypeRepository.findAll({
        search: query,
        limit: type === 'all' ? Math.ceil(limit / 2) : limit
      });
      results.tanks = tankResults.data;
    }
    
    if (type === 'items' || type === 'all') {
      const itemResults = await inventoryItemRepository.findAll({
        search: query,
        limit: type === 'all' ? Math.ceil(limit / 2) : limit
      });
      results.items = itemResults.data;
    }
    
    results.total_results = (results.tanks?.length ?? 0) + (results.items?.length ?? 0);
    
    return results;
  }
};
```

### Phase 4: Controller Layer

#### Product Controller
**File**: `src/controllers/productController.ts`

```typescript
import { Request, Response } from "express";
import { productService } from "@/services/productService";
import { insertTankTypeSchema, updateTankTypeSchema } from "@/db/schemas/inventory/tank-type";
import { insertInventoryItemSchema, updateInventoryItemSchema } from "@/db/schemas/inventory/inventory-item";
import { z } from "zod";

// Query parameter validation schemas
const tankTypeFiltersSchema = z.object({
  include_deleted: z.coerce.boolean().optional(),
  search: z.string().optional(),
  weight: z.string().optional(),
  price_min: z.coerce.number().optional(),
  price_max: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional()
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  type: z.enum(['tanks', 'items', 'all']).optional(),
  limit: z.coerce.number().min(1).max(50).optional()
});

export const productController = {
  // Tank Types
  async getTankTypes(req: Request, res: Response) {
    try {
      const filters = tankTypeFiltersSchema.parse(req.query);
      const result = await productService.getTankTypes(filters);
      
      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.errors
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve tank types"
        }
      });
    }
  },

  async getTankTypeById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid tank type ID"
          }
        });
      }
      
      const tankType = await productService.getTankTypeById(id);
      res.json(tankType);
    } catch (error) {
      if (error.message === "Tank type not found") {
        return res.status(404).json({
          error: {
            code: "TANK_TYPE_NOT_FOUND",
            message: "Tank type not found"
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve tank type"
        }
      });
    }
  },

  async createTankType(req: Request, res: Response) {
    try {
      const data = insertTankTypeSchema.parse(req.body);
      const tankType = await productService.createTankType(data);
      
      res.status(201).json(tankType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid tank type data",
            details: error.errors
          }
        });
      }
      
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          error: {
            code: "NAME_ALREADY_EXISTS",
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create tank type"
        }
      });
    }
  },

  async updateTankType(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid tank type ID"
          }
        });
      }
      
      const data = updateTankTypeSchema.parse(req.body);
      const tankType = await productService.updateTankType(id, data);
      
      res.json(tankType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid tank type data",
            details: error.errors
          }
        });
      }
      
      if (error.message === "Tank type not found") {
        return res.status(404).json({
          error: {
            code: "TANK_TYPE_NOT_FOUND",
            message: "Tank type not found"
          }
        });
      }
      
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          error: {
            code: "NAME_ALREADY_EXISTS",
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update tank type"
        }
      });
    }
  },

  async deleteTankType(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid tank type ID"
          }
        });
      }
      
      await productService.deleteTankType(id);
      
      res.json({
        success: true,
        message: "Tank type deleted successfully"
      });
    } catch (error) {
      if (error.message === "Tank type not found") {
        return res.status(404).json({
          error: {
            code: "TANK_TYPE_NOT_FOUND",
            message: "Tank type not found"
          }
        });
      }
      
      if (error.message.includes("referenced")) {
        return res.status(409).json({
          error: {
            code: "DELETION_BLOCKED",
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete tank type"
        }
      });
    }
  },

  async restoreTankType(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          error: {
            code: "INVALID_ID",
            message: "Invalid tank type ID"
          }
        });
      }
      
      const tankType = await productService.restoreTankType(id);
      res.json(tankType);
    } catch (error) {
      if (error.message === "Tank type not found") {
        return res.status(404).json({
          error: {
            code: "TANK_TYPE_NOT_FOUND",
            message: "Tank type not found"
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to restore tank type"
        }
      });
    }
  },

  // Similar methods for inventory items...

  async searchProducts(req: Request, res: Response) {
    try {
      const { q, type, limit } = searchQuerySchema.parse(req.query);
      const results = await productService.searchProducts(q, type, limit);
      
      res.json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid search parameters",
            details: error.errors
          }
        });
      }
      
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to search products"
        }
      });
    }
  }
};
```

### Phase 5: API Routes

#### Product Routes
**File**: `src/routes/productRoutes.ts`

```typescript
import { Router } from "express";
import { productController } from "@/controllers/productController";
import { authenticateToken } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorization";

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Tank Types Routes
router.get("/tank-types", authorizeRoles(["admin", "operator"]), productController.getTankTypes);
router.get("/tank-types/:id", authorizeRoles(["admin", "operator"]), productController.getTankTypeById);
router.post("/tank-types", authorizeRoles(["admin", "operator"]), productController.createTankType);
router.put("/tank-types/:id", authorizeRoles(["admin", "operator"]), productController.updateTankType);
router.delete("/tank-types/:id", authorizeRoles(["admin", "operator"]), productController.deleteTankType);
router.patch("/tank-types/:id/restore", authorizeRoles(["admin", "operator"]), productController.restoreTankType);

// Inventory Items Routes
router.get("/items", authorizeRoles(["admin", "operator"]), productController.getInventoryItems);
router.get("/items/:id", authorizeRoles(["admin", "operator"]), productController.getInventoryItemById);
router.post("/items", authorizeRoles(["admin", "operator"]), productController.createInventoryItem);
router.put("/items/:id", authorizeRoles(["admin", "operator"]), productController.updateInventoryItem);
router.delete("/items/:id", authorizeRoles(["admin", "operator"]), productController.deleteInventoryItem);
router.patch("/items/:id/restore", authorizeRoles(["admin", "operator"]), productController.restoreInventoryItem);

// Search Route
router.get("/search", authorizeRoles(["admin", "operator", "delivery"]), productController.searchProducts);

export default router;
```

### Phase 6: Integration

#### Update Main App
**File**: `src/app.ts`

```typescript
// Add to existing imports
import productRoutes from "@/routes/productRoutes";

// Add to existing routes
app.use("/v1/products", productRoutes);
```

## Testing Strategy

### Unit Tests Structure

#### Repository Tests
```typescript
// src/tests/repositories/tankTypeRepository.test.ts
describe("TankTypeRepository", () => {
  describe("findAll", () => {
    it("should return active tank types by default");
    it("should include deleted tank types when specified");
    it("should filter by search term");
    it("should filter by weight");
    it("should filter by price range");
    it("should paginate results correctly");
  });
  
  describe("create", () => {
    it("should create tank type with valid data");
    it("should set is_active to true by default");
    it("should set timestamps automatically");
  });
  
  describe("softDelete", () => {
    it("should mark tank type as inactive");
    it("should set deleted_at timestamp");
    it("should not physically delete the record");
  });
});
```

#### Service Tests
```typescript
// src/tests/services/productService.test.ts
describe("ProductService", () => {
  describe("createTankType", () => {
    it("should create tank type with valid data");
    it("should throw error for duplicate name");
    it("should validate sell price > purchase price");
  });
  
  describe("deleteTankType", () => {
    it("should soft delete tank type");
    it("should prevent deletion if referenced in orders");
    it("should prevent deletion if referenced in inventory");
  });
});
```

## Database Migration Commands

```bash
# Update schema
npm run db:push

# Create indexes
psql -d your_database -c "
CREATE INDEX CONCURRENTLY idx_tank_type_active ON tank_type(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_tank_type_name ON tank_type(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_inventory_item_active ON inventory_item(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_inventory_item_name ON inventory_item(name) WHERE is_active = true;
"
```

## Performance Considerations

### Database Optimization
- Use partial indexes for active records only
- Implement proper pagination for large datasets
- Consider database-level full-text search for complex queries

### Caching Strategy
- Cache frequently accessed products
- Implement cache invalidation on updates
- Consider Redis for high-traffic scenarios

### API Optimization
- Implement response compression
- Add request rate limiting
- Use database connection pooling

## Security Considerations

### Input Validation
- Sanitize all user inputs
- Validate price ranges and formats
- Prevent SQL injection through parameterized queries

### Authorization
- Role-based access control for all operations
- Audit logging for sensitive operations
- Rate limiting to prevent abuse

### Data Protection
- Encrypt sensitive price information if required
- Implement soft deletes to maintain audit trails
- Regular security audits and updates

This implementation guide provides a comprehensive roadmap for developing the Products module while following established patterns and best practices in the LPG delivery backend system.