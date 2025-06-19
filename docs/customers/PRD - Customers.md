# Customers Module - Product Requirements Document (PRD)

## Executive Summary

The Customers module provides focused CRUD operations and name-based search functionality for customer management in the LPG delivery business. This module leverages the existing comprehensive customer database schema and repository layer to expose essential customer operations through clean REST APIs, optimized for operator workflows during order processing.

## Business Context

### Current Customer Architecture

The LPG delivery business uses a **comprehensive customer management system** with:

1. **Customers Table** (`customers`)
   - Complete customer information including contact details, address, and business metrics
   - Customer types: regular, wholesale, recurrent
   - Peruvian phone number format support
   - Soft delete capability with `isActive` field

2. **Customer Debts Table** (`customer_debts`)
   - Credit management and debt tracking
   - Integration with order payment status

3. **Order Integration**
   - Optional customer references in orders
   - Customer metrics automatically updated from order activities

### Business Requirements

- **Operator-Focused Search**: Operators identify customers by name, not phone numbers
- **Quick Customer Registration**: Streamlined customer creation during order flow
- **Basic Customer Management**: Essential CRUD operations for customer data
- **Data Integrity**: Soft delete to preserve order references and business history
- **Role-Based Access**: Different permission levels for different user types

## Technical Requirements

### API Scope and Limitations

#### **In Scope for Basic Customer API**
- Basic CRUD operations (Create, Read, Update, Delete)
- Name-based search functionality
- Customer profile management
- Soft delete operations

#### **Out of Scope** (Future Implementation)
- Customer analytics and metrics (future `/customers/:id/metrics` endpoints)
- Debt management operations
- Advanced customer insights
- Order history management (handled by Orders module)

### API Specification

#### Customer Endpoints

```typescript
// List customers with optional name search
GET /v1/customers
Query Parameters:
  - search?: string (search in firstName + lastName combination)
  - include_inactive?: boolean (default: false)
  - limit?: number (default: 50, max: 100)
  - offset?: number (default: 0)

Response: {
  data: Customer[],
  pagination: { total: number, limit: number, offset: number }
}

// Get specific customer
GET /v1/customers/:id
Response: Customer

// Create customer (using QuickCustomerCreationSchema)
POST /v1/customers
Body: {
  firstName: string,
  lastName: string,
  phoneNumber: string,
  address: string,
  alternativePhone?: string,
  locationReference?: string
}
Response: Customer

// Update customer (partial updates)
PUT /v1/customers/:id
Body: {
  address?: string,
  alternativePhone?: string,
  locationReference?: string
}
Response: Customer

// Soft delete customer
DELETE /v1/customers/:id
Response: { success: boolean, message: string }

// Restore customer
PATCH /v1/customers/:id/restore
Response: Customer
```

#### Search Endpoint

```typescript
// Search customers by name
GET /v1/customers/search
Query Parameters:
  - q: string (required - search term for firstName + lastName)
  - limit?: number (default: 20, max: 50)

Response: {
  data: Customer[],
  total_results: number
}
```

### Data Transfer Objects

#### Customer Response DTO
```typescript
interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  alternativePhone: string | null;
  address: string;
  locationReference: string | null;
  customerType: 'regular' | 'wholesale' | 'recurrent';
  rating: number | null;
  isActive: boolean;
  lastOrderDate: string | null;
  preferredPaymentMethod: string | null;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Quick Customer Creation Request DTO
```typescript
interface QuickCustomerCreationRequest {
  firstName: string;      // 1-50 chars, required
  lastName: string;       // 1-50 chars, required
  phoneNumber: string;    // Peruvian format (+51), required, unique
  address: string;        // Required
  alternativePhone?: string;     // Optional, Peruvian format
  locationReference?: string;    // Optional address reference
}
```

#### Customer Update Request DTO
```typescript
interface CustomerUpdateRequest {
  address?: string;              // Update address
  alternativePhone?: string;     // Update alternative phone
  locationReference?: string;    // Update location reference
}
```

#### Customer Search Request DTO
```typescript
interface CustomerSearchRequest {
  q: string;           // Search term (firstName + lastName)
  limit?: number;      // Results limit (1-50, default: 20)
}

interface CustomerListRequest {
  search?: string;           // Name search term
  include_inactive?: boolean; // Include soft-deleted customers
  limit?: number;           // Page size (1-100, default: 50)
  offset?: number;          // Pagination offset (default: 0)
}
```

### Business Logic Requirements

#### Validation Rules

1. **Customer Creation**
   - `firstName` and `lastName` required (1-50 characters each)
   - `phoneNumber` required, unique, Peruvian format validation
   - `address` required
   - `alternativePhone` optional, Peruvian format if provided
   - Automatic `customerType` set to 'regular'

2. **Customer Updates**
   - Only `address`, `alternativePhone`, and `locationReference` can be updated
   - Phone number format validation for `alternativePhone`
   - Cannot update `firstName`, `lastName`, or primary `phoneNumber`

3. **Name Search Rules**
   - Search combines `firstName + " " + lastName`
   - Case-insensitive partial matching
   - Minimum 2 characters required for search
   - Only searches active customers by default

4. **Soft Delete Rules**
   - Cannot delete customers referenced in active orders
   - Deleted customers excluded from default listings and searches
   - Soft delete preserves customer data for order history integrity

#### Integration Points

1. **Orders System**
   - Customers can be referenced in orders via `customerId`
   - Customer metrics updated automatically by Orders module
   - Customer deletion blocked if referenced in orders

2. **Debt Management**
   - Customer debts maintained separately (out of scope for basic API)
   - Future debt management endpoints will extend this module

### Error Handling

#### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Customer not found
- `409` - Conflict (phone number already exists, deletion blocked)
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
- `CUSTOMER_NOT_FOUND` - Customer ID doesn't exist
- `PHONE_ALREADY_EXISTS` - Duplicate phone number
- `INVALID_PHONE_FORMAT` - Invalid Peruvian phone format
- `DELETION_BLOCKED` - Customer referenced in orders
- `VALIDATION_ERROR` - Invalid input data
- `SEARCH_TERM_TOO_SHORT` - Search term less than 2 characters

### Security & Permissions

#### Role-Based Access Control
- **Admin Users**: Full CRUD operations on all customers
- **Operator Users**: Full CRUD operations on all customers
- **Delivery Users**: Read-only access to customer information

#### Permission Requirements
- **Read Operations**: Any authenticated user
- **Create Operations**: `CUSTOMERS:CREATE` permission (admin, operator)
- **Update Operations**: `CUSTOMERS:UPDATE` permission (admin, operator)
- **Delete Operations**: `CUSTOMERS:DELETE` permission (admin, operator)

#### Data Validation
- Phone number format validation for Peruvian numbers
- Input sanitization for all text fields
- SQL injection prevention through parameterized queries

### Performance Requirements

#### Response Times
- List operations: < 200ms for up to 100 customers
- Search operations: < 300ms for name searches
- CRUD operations: < 100ms per operation

#### Search Optimization
- Efficient name search using database indexes
- Combined `firstName + lastName` search optimization
- Pagination support for large customer bases

#### Scalability
- Support up to 10,000 active customers
- Efficient pagination for large result sets
- Optimized queries for name-based searches

## Implementation Strategy

### Service Layer Design

```typescript
interface CustomerService {
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
```

### Repository Integration

The service layer will utilize **only basic repository methods** needed for CRUD operations:

```typescript
// Repository methods to be used by service
- findAll(filters)      // For customer listing
- findById(id)          // For customer retrieval
- findByPhone(phone)    // For duplicate checking
- create(data)          // For customer creation
- update(id, data)      // For customer updates
- softDelete(id)        // For customer deletion
- restore(id)           // For customer restoration
- searchByName(query)   // For name-based search
- isReferencedInOrders(id) // For deletion validation
```

**Note**: Advanced analytics and metrics methods in the repository will be reserved for future `/customers/:id/metrics` endpoints.

### Database Optimizations

#### Indexes for Performance
```sql
-- Name search optimization
CREATE INDEX idx_customers_name_search ON customers 
USING gin(to_tsvector('spanish', first_name || ' ' || last_name)) 
WHERE is_active = true;

-- Phone number lookup
CREATE INDEX idx_customers_phone ON customers(phone_number) WHERE is_active = true;

-- Active customers filter
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;
```

## Testing Strategy

### Unit Tests (Not Implemented - Per Client Request)
- Service layer: Business logic validation and error handling
- Repository integration: Basic CRUD operations
- Controller layer: Request/response handling and validation

### Integration Points Testing
- Orders system integration verification
- Soft delete functionality validation
- Permission-based access control testing

## Success Metrics

### Functional Requirements
- All CRUD operations working correctly
- Name-based search with sub-300ms response time
- Soft delete with proper order reference checking
- Role-based access control enforcement

### Business Metrics
- Reduced customer lookup time for operators
- Improved customer data accuracy and completeness
- Streamlined customer registration during order flow
- Foundation for future customer analytics features

## Future Enhancements

### Planned Features (Out of Current Scope)
- Customer analytics endpoints (`/customers/:id/metrics`)
- Debt management operations
- Customer order history views
- Advanced search filters (customer type, location, order patterns)
- Customer communication history
- Customer loyalty program integration

### Technical Improvements
- Advanced search with Elasticsearch
- Real-time customer updates via WebSockets
- Customer data import/export functionality
- Integration with external CRM systems
- Customer behavior analytics

## Dependencies

### Internal Systems
- Orders module (for customer reference validation)
- Authentication and authorization system
- Existing customer repository layer

### External Libraries
- Drizzle ORM for database operations
- Zod for data validation
- Express.js for API endpoints

### Database Requirements
- PostgreSQL 12+ with existing customer tables
- Full-text search capabilities for name searches
- Transaction support for data consistency

## Conclusion

The Customers module provides essential customer management functionality optimized for operator workflows in the LPG delivery business. By focusing on core CRUD operations and name-based search, this module delivers immediate business value while establishing a foundation for future advanced customer management features.

The module leverages the existing comprehensive customer database schema and repository layer, ensuring consistency with the established architecture while providing clean, efficient APIs for customer operations.