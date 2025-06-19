# Products Module - Product Requirements Document (PRD)

## Executive Summary

The Products module provides comprehensive CRUD operations and search functionality for the LPG delivery business's product catalog, consisting of tank types and inventory items. This module exposes existing product data through clean REST APIs while maintaining integration with the established store catalog, inventory, and orders systems.

## Business Context

### Current Product Architecture

The LPG delivery business uses a **dual-product model**:

1. **Tank Types** (`tank_type` table)
   - LPG tanks in various sizes (5kg, 10kg, 45kg)
   - Premium and regular variants
   - Core business product with tank exchange model

2. **Inventory Items** (`inventory_item` table)
   - Accessories: valves, adapters, hoses
   - Kitchen accessories and replacement parts
   - Traditional sales model (no exchange)

### Business Requirements

- **Product Management**: Both admin and operator users can manage products
- **Global Pricing**: Base pricing in product tables serves as reference for store catalogs
- **Store Integration**: Products auto-populate store catalogs with base pricing
- **Data Integrity**: Soft deletes to maintain historical references
- **Search Capability**: Efficient product discovery and filtering

## Technical Requirements

### Database Schema Enhancements

#### Soft Delete Support
Add soft delete columns to existing tables:

```sql
-- tank_type table
ALTER TABLE tank_type ADD COLUMN deleted_at timestamp;
ALTER TABLE tank_type ADD COLUMN is_active boolean DEFAULT true;

-- inventory_item table  
ALTER TABLE inventory_item ADD COLUMN deleted_at timestamp;
ALTER TABLE inventory_item ADD COLUMN is_active boolean DEFAULT true;
```

#### Indexes for Performance
```sql
-- Tank types
CREATE INDEX idx_tank_type_active ON tank_type(is_active) WHERE is_active = true;
CREATE INDEX idx_tank_type_name ON tank_type(name) WHERE is_active = true;

-- Inventory items
CREATE INDEX idx_inventory_item_active ON inventory_item(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_item_name ON inventory_item(name) WHERE is_active = true;
```

### API Specification

#### Tank Types Endpoints

```typescript
// List tank types
GET /v1/products/tank-types
Query Parameters:
  - include_deleted?: boolean (default: false)
  - search?: string (search in name, description)
  - weight?: string (filter by weight)
  - price_min?: number, price_max?: number
  - limit?: number (default: 50), offset?: number (default: 0)

Response: {
  data: TankType[],
  pagination: { total: number, limit: number, offset: number }
}

// Get specific tank type
GET /v1/products/tank-types/:id
Response: TankType

// Create tank type
POST /v1/products/tank-types
Body: {
  name: string,
  weight: string,
  description?: string,
  purchase_price: number,
  sell_price: number,
  scale?: string
}
Response: TankType

// Update tank type
PUT /v1/products/tank-types/:id
Body: Partial<TankType>
Response: TankType

// Soft delete tank type
DELETE /v1/products/tank-types/:id
Response: { success: boolean, message: string }

// Restore tank type
PATCH /v1/products/tank-types/:id/restore
Response: TankType
```

#### Inventory Items Endpoints

```typescript
// List inventory items
GET /v1/products/items
Query Parameters: (same as tank types)

// Get specific item
GET /v1/products/items/:id
Response: InventoryItem

// Create item
POST /v1/products/items
Body: {
  name: string,
  description?: string,
  purchase_price: number,
  sell_price: number,
  scale: string
}
Response: InventoryItem

// Update item
PUT /v1/products/items/:id
Body: Partial<InventoryItem>
Response: InventoryItem

// Soft delete item
DELETE /v1/products/items/:id
Response: { success: boolean, message: string }

// Restore item
PATCH /v1/products/items/:id/restore
Response: InventoryItem
```

#### Combined Search Endpoint

```typescript
// Search across all products
GET /v1/products/search
Query Parameters:
  - q: string (required - search term)
  - type?: 'tanks' | 'items' | 'all' (default: 'all')
  - price_min?: number, price_max?: number
  - limit?: number (default: 20)

Response: {
  tanks: TankType[],
  items: InventoryItem[],
  total_results: number
}
```

### Data Transfer Objects

#### TankType DTO
```typescript
interface TankType {
  typeId: number;
  name: string;
  weight: string;
  description: string | null;
  purchase_price: string;
  sell_price: string;
  scale: string;
  is_active: boolean;
  deleted_at: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateTankTypeRequest {
  name: string;
  weight: string;
  description?: string;
  purchase_price: number;
  sell_price: number;
  scale?: string;
}
```

#### InventoryItem DTO
```typescript
interface InventoryItem {
  inventoryItemId: number;
  name: string;
  description: string | null;
  purchase_price: string;
  sell_price: string;
  scale: string;
  is_active: boolean;
  deleted_at: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateInventoryItemRequest {
  name: string;
  description?: string;
  purchase_price: number;
  sell_price: number;
  scale: string;
}
```

### Business Logic Requirements

#### Validation Rules

1. **Price Validation**
   - `sell_price` must be greater than `purchase_price`
   - Both prices must be positive numbers
   - Maximum precision: 10 digits, 2 decimal places

2. **Name Validation**
   - Unique names within each product type
   - Maximum length: 50 characters for tank types, 100 for items
   - No leading/trailing whitespace

3. **Soft Delete Rules**
   - Cannot delete products referenced in active orders
   - Cannot delete products with current inventory assignments
   - Deleted products excluded from default listings

4. **Update Rules**
   - Cannot change core identifiers (name, weight for tanks)
   - Price updates don't retroactively affect existing orders
   - Store catalogs maintain their own pricing

#### Integration Points

1. **Store Catalogs**
   - New products auto-populate to all active stores
   - Base pricing used as default for store catalog pricing
   - Store catalog pricing can diverge from base pricing

2. **Orders System**
   - Only active products available for new orders
   - Deleted products maintain order history integrity
   - Product updates don't affect existing order pricing

3. **Inventory System**
   - Only active products available for new inventory assignments
   - Deleted products maintain transaction history integrity

### Error Handling

#### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Product not found
- `409` - Conflict (name already exists, deletion blocked)
- `422` - Unprocessable Entity (business rule violations)
- `500` - Internal Server Error

#### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

#### Common Error Scenarios
- `PRODUCT_NOT_FOUND` - Product ID doesn't exist
- `NAME_ALREADY_EXISTS` - Duplicate product name
- `INVALID_PRICE_RANGE` - Sell price not greater than purchase price
- `DELETION_BLOCKED` - Product referenced in active orders/inventory
- `VALIDATION_ERROR` - Invalid input data

### Security & Permissions

#### Role-Based Access
- **Admin Users**: Full CRUD operations on all products
- **Operator Users**: Full CRUD operations on all products  
- **Delivery Users**: Read-only access to products

#### Data Validation
- All input sanitized and validated using Zod schemas
- SQL injection prevention through parameterized queries
- Price manipulation validation

### Performance Requirements

#### Response Times
- List operations: < 200ms for up to 100 products
- Search operations: < 300ms
- CRUD operations: < 100ms

#### Scalability
- Support up to 1000 tank types and 5000 inventory items
- Efficient pagination for large result sets
- Database indexes for fast search operations

### Testing Requirements

#### Unit Tests
- Repository layer: CRUD operations and soft delete logic
- Service layer: Business logic validation and error handling
- Controller layer: Request/response handling and validation

#### Integration Tests
- Database transactions and rollback scenarios
- Error handling and edge cases
- Store catalog integration points

#### Test Coverage
- Minimum 90% code coverage
- All business logic paths tested
- Error scenarios and edge cases covered

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema updates (soft delete columns)
- Repository layer with basic CRUD operations
- Service layer with core business logic
- Basic API endpoints for both product types

### Phase 2: Enhanced Features (Week 2)
- Search and filtering functionality
- Soft delete and restore operations
- Comprehensive validation and error handling
- Performance optimizations and indexing

### Phase 3: Integration & Testing (Week 3)
- Store catalog integration testing
- Orders/inventory system integration verification
- Comprehensive test suite
- Performance testing and optimization

### Phase 4: Documentation & Deployment (Week 4)
- API documentation
- User guides for product management
- Deployment and monitoring setup

## Success Metrics

### Functional Metrics
- All CRUD operations working correctly
- Search response time < 300ms
- 100% uptime for product APIs
- Zero data integrity issues

### Business Metrics
- Reduced time for product management tasks
- Improved accuracy in product information
- Better user experience for product discovery
- Foundation for future catalog enhancements

## Future Enhancements

### Planned Features
- Product categories and grouping
- Bulk import/export functionality
- Product image management
- Advanced pricing strategies (bulk discounts, seasonal pricing)
- Product lifecycle management
- Integration with external suppliers

### Technical Improvements
- GraphQL API support
- Real-time product updates via WebSockets
- Advanced search with Elasticsearch
- Product recommendation engine
- Analytics and reporting dashboard

## Dependencies

### Internal Systems
- Store management system
- Orders module
- Inventory management system
- Authentication and authorization system

### External Libraries
- Drizzle ORM for database operations
- Zod for data validation
- Express.js for API endpoints
- Jest for testing

### Database Requirements
- PostgreSQL 12+ with JSON support
- Full-text search capabilities
- Transaction support for data consistency

## Conclusion

The Products module provides a solid foundation for product management in the LPG delivery business. By leveraging existing database structures and following established patterns, this module will integrate seamlessly with current operations while providing the flexibility for future enhancements.

The focus on simplicity, performance, and integration ensures that users can efficiently manage the product catalog while maintaining data integrity across all business operations.