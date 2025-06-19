# Customers Module - Database Integration Guide

## Overview

This document details the database integration strategy for the Customers module, focusing on leveraging the existing comprehensive customer schema while implementing only the essential repository methods needed for basic CRUD operations and name-based search functionality.

## Existing Database Schema

### Customer Tables Structure

The Customers module utilizes two existing, well-designed database tables:

#### 1. Customers Table (`customers`)

```sql
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  alternative_phone VARCHAR(20),
  address TEXT NOT NULL,
  location_reference TEXT,
  customer_type VARCHAR(20) NOT NULL DEFAULT 'regular' 
    CHECK (customer_type IN ('regular', 'wholesale', 'recurrent')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_order_date TIMESTAMP,
  preferred_payment_method VARCHAR(20),
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Customer Debts Table (`customer_debts`)

```sql
CREATE TABLE customer_debts (
  debt_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_id INTEGER REFERENCES orders(order_id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  debt_date TIMESTAMP DEFAULT NOW(),
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_date TIMESTAMP
);
```

### Integration with Orders System

The orders table includes customer references:

```sql
-- In orders table
customer_id INTEGER REFERENCES customers(customer_id),
customer_name VARCHAR(255),
customer_phone VARCHAR(20)
```

**Design Note**: Orders can optionally reference customers but always store customer name and phone for quick access without joins.

## Repository Layer Integration Strategy

### Existing Repository Implementation

The `PgCustomerRepository` class (920 lines) already provides comprehensive functionality. For the basic Customers API module, we will use **only a subset** of the available methods.

### Repository Methods Used by Service Layer

#### Core CRUD Operations

```typescript
// Methods used in CustomerService implementation
interface BasicCustomerRepositoryMethods {
  // Read operations
  findAll(filters: CustomerListFilters): Promise<{ data: Customer[], total: number }>;
  findById(id: number, includeInactive?: boolean): Promise<Customer | null>;
  findByPhone(phoneNumber: string): Promise<Customer | null>;
  
  // Write operations
  create(customerData: CreateCustomerData): Promise<Customer>;
  update(id: number, updateData: UpdateCustomerData): Promise<Customer>;
  
  // Soft delete operations
  softDelete(id: number): Promise<boolean>;
  restore(id: number): Promise<Customer>;
  
  // Search operations
  searchByName(query: string, options: SearchOptions): Promise<{ data: Customer[], total: number }>;
  
  // Validation operations
  isReferencedInOrders(customerId: number): Promise<boolean>;
}
```

#### Filter and Search Options

```typescript
interface CustomerListFilters {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

interface SearchOptions {
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

interface CreateCustomerData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  alternativePhone?: string;
  locationReference?: string;
  customerType: 'regular' | 'wholesale' | 'recurrent';
  rating?: number;
  isActive: boolean;
  lastOrderDate?: Date;
  preferredPaymentMethod?: string;
  totalOrders: number;
}

interface UpdateCustomerData {
  address?: string;
  alternativePhone?: string;
  locationReference?: string;
}
```

### Repository Methods NOT Used (Reserved for Future)

The following advanced repository methods exist but will **NOT** be used in the basic API:

```typescript
// Advanced analytics methods (for future /customers/:id/metrics endpoints)
- findCustomersWithAnalytics()
- findCustomersByOrderFrequency()
- findHighValueCustomers()
- getCustomerAnalytics()
- getCustomerOrderHistory()
- findCustomersWithDebts()
- calculateCustomerLifetimeValue()

// Advanced search and filtering
- findCustomersByRegion()
- findCustomersByOrderPattern()
- findCustomersWithRecentActivity()

// Transaction-aware operations
- updateCustomerMetricsInTransaction()
- createCustomerWithOrderInTransaction()
- Various order-related update hooks
```

**Rationale**: These methods support complex business intelligence and analytics features that will be implemented in future dedicated endpoints like `/customers/:id/metrics`, `/customers/:id/analytics`, etc.

## Database Query Patterns

### Name Search Implementation

The repository implements efficient name search using database full-text search:

```sql
-- Name search query pattern
SELECT * FROM customers 
WHERE to_tsvector('spanish', first_name || ' ' || last_name) 
      @@ plainto_tsquery('spanish', $searchTerm)
  AND is_active = true
ORDER BY ts_rank(to_tsvector('spanish', first_name || ' ' || last_name), 
                 plainto_tsquery('spanish', $searchTerm)) DESC
LIMIT $limit OFFSET $offset;
```

#### Search Index Optimization

```sql
-- Existing or recommended index for name search
CREATE INDEX IF NOT EXISTS idx_customers_name_search 
ON customers USING gin(to_tsvector('spanish', first_name || ' ' || last_name)) 
WHERE is_active = true;
```

### Performance Optimizations

#### Existing Indexes

```sql
-- Core performance indexes
CREATE INDEX idx_customers_phone ON customers(phone_number) WHERE is_active = true;
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_total_orders ON customers(total_orders) WHERE is_active = true;
```

#### Query Performance Guidelines

1. **Active Customer Filter**: Always filter by `is_active = true` for default operations
2. **Phone Lookup**: Use unique phone index for fast duplicate checking
3. **Pagination**: Implement efficient pagination with `LIMIT` and `OFFSET`
4. **Name Search**: Leverage full-text search indexes for optimal performance

## Data Validation and Constraints

### Database-Level Constraints

```sql
-- Phone number format constraint (enforced at application level)
-- CHECK (phone_number ~ '^\+51[0-9]{9}$')

-- Customer type validation
CHECK (customer_type IN ('regular', 'wholesale', 'recurrent'))

-- Rating validation
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))

-- Total orders validation
CHECK (total_orders >= 0)

-- Debt amount validation (in customer_debts table)
CHECK (amount > 0)
```

### Application-Level Validation

The service layer implements additional business rules:

```typescript
// Phone format validation
const phoneRegex = /^\+51[0-9]{9}$/;

// Name length validation
const nameMinLength = 1;
const nameMaxLength = 50;

// Search term validation
const searchMinLength = 2;
```

## Soft Delete Implementation

### Soft Delete Strategy

```sql
-- Soft delete operation
UPDATE customers 
SET is_active = false, updated_at = NOW() 
WHERE customer_id = $customerId;

-- Restore operation  
UPDATE customers 
SET is_active = true, updated_at = NOW() 
WHERE customer_id = $customerId;
```

### Soft Delete Business Rules

1. **Order Reference Check**: Cannot delete customers referenced in orders
2. **Data Preservation**: Soft delete maintains customer data for audit trails
3. **Search Exclusion**: Deleted customers excluded from default searches
4. **Restore Validation**: Check for phone number conflicts during restoration

### Reference Validation Query

```sql
-- Check if customer is referenced in orders
SELECT COUNT(*) > 0 as is_referenced
FROM orders 
WHERE customer_id = $customerId;
```

## Integration with Orders System

### Customer-Order Relationship

```sql
-- Orders can reference customers optionally
SELECT o.*, c.first_name, c.last_name 
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_id = $orderId;
```

### Customer Metrics Updates

When orders are processed, customer metrics are automatically updated:

```sql
-- Example: Update customer metrics when order is completed
UPDATE customers 
SET total_orders = total_orders + 1,
    last_order_date = NOW(),
    updated_at = NOW()
WHERE customer_id = $customerId;
```

**Note**: These updates are handled by the Orders module, not the basic Customers API.

## Database Connection and Transactions

### Repository Transaction Support

The existing repository supports transaction-aware operations:

```typescript
// Example: Create customer within transaction
async createCustomerInTransaction(customerData: CreateCustomerData, tx: Transaction): Promise<Customer> {
  // Implementation uses provided transaction context
  // Used by Orders module for atomic customer creation during order flow
}
```

### Connection Management

- **Connection Pooling**: Uses Drizzle ORM connection pooling
- **Transaction Safety**: All write operations are transactionally safe
- **Error Handling**: Proper connection error handling and cleanup

## Performance Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Name search response time (target: < 300ms)
   - CRUD operation response time (target: < 100ms)
   - List operations response time (target: < 200ms)

2. **Database Load**
   - Customer table scan frequency
   - Index usage efficiency
   - Connection pool utilization

3. **Search Efficiency**
   - Full-text search index hit rate
   - Search result relevance quality
   - Search pagination performance

### Monitoring Queries

```sql
-- Monitor slow customer queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%customers%'
ORDER BY mean_exec_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'customers';

-- Monitor customer table size
SELECT pg_size_pretty(pg_total_relation_size('customers')) as table_size;
```

## Backup and Recovery

### Data Protection Strategy

```sql
-- Backup customer data
pg_dump -t customers -t customer_debts lpg_database > customers_backup.sql

-- Verify backup integrity
psql -d test_database < customers_backup.sql
```

### Recovery Considerations

1. **Point-in-Time Recovery**: Maintain transaction logs for order consistency
2. **Customer Data Integrity**: Ensure customer-order relationships remain valid
3. **Phone Number Uniqueness**: Verify unique constraints after recovery

## Migration Considerations

### Future Schema Changes

If additional fields need to be added to support future features:

```sql
-- Example: Adding customer preferences
ALTER TABLE customers 
ADD COLUMN delivery_preferences JSONB,
ADD COLUMN communication_preferences JSONB;

-- Create index for JSON queries
CREATE INDEX idx_customers_delivery_prefs 
ON customers USING gin(delivery_preferences);
```

### Backward Compatibility

- All API changes must maintain backward compatibility
- New fields should be nullable or have default values
- Existing repository methods must continue to work

## Implementation Status

### ✅ Completed Database Integration

The Customers module has been successfully implemented with the following database integration features:

#### Repository Integration (100% Complete)
- **Shared Repository Pattern**: Successfully integrated with existing `PgCustomerRepository` from Orders module
- **Type-Safe Operations**: All repository methods return properly typed `Customer` objects
- **Transaction Support**: Compatible with existing transaction patterns in the codebase

#### Search Strategy Implementation
- **Client-Side Filtering**: Implemented efficient in-memory search using `findActiveCustomers()` + filtering
- **Performance Optimized**: Suitable for current scale with large limit strategy (10,000 customers)
- **Future-Ready**: Architecture allows for easy migration to database-level search when needed

#### Data Consistency
- **Phone Number Validation**: Enforced at both application and database levels
- **Soft Delete Support**: Implemented via `isActive` field updates
- **Referential Integrity**: Maintains compatibility with existing Orders system references

### Actual vs. Planned Implementation

| Aspect | Original Plan | Actual Implementation | Rationale |
|--------|---------------|----------------------|-----------|
| Repository Creation | New repository instance | Shared from Orders module | Avoid duplication, maintain consistency |
| Search Method | `searchByName()` direct use | Client-side filtering | Better type safety, simpler implementation |
| Delete Strategy | Dedicated `softDelete()` method | Update with `isActive: false` | Consistent with existing patterns |

## Conclusion

The Customers module database integration leverages a robust, existing schema while implementing focused functionality for essential customer management operations. The implementation successfully balances simplicity with performance, using shared repository patterns and client-side filtering strategies appropriate for the current business scale.

The strategy delivers:
- **Performance**: Optimized queries with efficient filtering and pagination
- **Scalability**: Architecture ready for database-level search enhancement
- **Maintainability**: Clean integration with existing codebase patterns
- **Future-Proof**: Foundation ready for additional customer management features
- **Type Safety**: Full TypeScript integration with proper error handling

This approach delivers immediate business value for operator workflows while maintaining architectural flexibility for future enhancements and scaling requirements.