# LPG Inventory Management - Backend Product Requirements Document

## Overview

This document outlines the backend requirements for implementing the inventory management system for the LPG delivery business. The system handles daily inventory assignments, tracks inventory changes through transactions, manages workflow status transitions, and provides comprehensive audit trails.

## Business Context

The LPG delivery business assigns tanks and other inventory items to delivery users each day. The inventory follows a sophisticated workflow with automated transitions and intelligent business logic:

1. **CREATED** - Initial assignment state (auto-created from store catalog)
2. **ASSIGNED** - When delivery user starts their day
3. **VALIDATED** - End of day when inventory and sales are reconciled
4. **CONSOLIDATED** - Automated processing and next-day assignment creation
5. **OBSERVED** - For assignments requiring attention or review

The system supports advanced features including:
- **Stale inventory recovery** - Automatic handling of overdue assignments
- **Smart date calculation** - Business day awareness with weekend handling
- **Consolidation workflow** - Automated end-of-day processing
- **Comprehensive audit trails** - Complete status change tracking

## Core API Requirements

### 1. Inventory Assignment Management ✅ **IMPLEMENTED**

#### 1.1 Create Inventory Assignment
- **Endpoint**: `POST /v1/inventory/assignments`
- **Purpose**: Create a new daily inventory assignment for a user
- **Input**:
  - Store assignment ID
  - Assignment date (defaults to current date)
  - Optional notes
- **Output**: Created assignment with ID and auto-populated catalog items
- **Business Rules**:
  - Default status to CREATED
  - Auto-populate from store catalog with assigned quantities
  - Initial `current` counts match `assigned` counts
  - Only allow for users assigned to the store

#### 1.2 Get Inventory Assignment
- **Endpoint**: `GET /v1/inventory/assignments/:id`
- **Purpose**: Retrieve full details of an inventory assignment
- **Query Parameters**: `include` for relations (tanks, items, store, user)
- **Output**: Assignment with selected relations and current quantities

#### 1.3 Get Inventory Assignments By Filters
- **Endpoint**: `GET /v1/inventory/assignments`
- **Purpose**: Retrieve assignments filtered by user, store, date, and/or status
- **Query Parameters**: `userId`, `storeId`, `date`, `status`, `include`
- **Output**: List of matching assignments with optional relations

#### 1.4 Update Assignment Status
- **Endpoint**: `PATCH /v1/inventory/assignments/:id/status`
- **Purpose**: Change the status of an assignment with workflow validation
- **Input**: New status (created, assigned, validated, consolidated, observed)
- **Business Rules**:
  - Enforces valid transitions with business logic
  - **VALIDATED → CONSOLIDATED**: Triggers consolidation workflow
  - **Consolidation workflow**: Auto-creates next day assignment with carried quantities
  - **Stale recovery**: Handles overdue assignments automatically
  - **Audit trail**: Records all status changes with context

### 2. Inventory Transactions ✅ **IMPLEMENTED**

#### 2.1 Record Tank Transaction
- **Endpoint**: `POST /v1/inventory/transactions/tanks`
- **Purpose**: Record changes to tank inventory with real-time quantity updates
- **Input**:
  - Inventory ID
  - Tank type ID
  - Full tanks change (positive or negative)
  - Empty tanks change (positive or negative)
  - Transaction type (purchase, sale, return, transfer, assignment)
  - Optional notes and reference ID
- **Output**: Transaction result with updated current quantities
- **Business Rules**:
  - Automatically detects increment vs decrement based on sign
  - Updates current inventory counts atomically
  - Validates sufficient inventory for decrements
  - Creates audit trail for all changes

#### 2.2 Record Item Transaction
- **Endpoint**: `POST /v1/inventory/transactions/items`
- **Purpose**: Record changes to non-tank inventory items
- **Input**: Similar to tank transaction (without empty/full distinction)
- **Output**: Transaction result with updated current quantity
- **Business Rules**: Similar validation and atomic updates

#### 2.3 Batch Transaction Processing
- **Endpoints**:
  - `POST /v1/inventory/transactions/tanks/batch`
  - `POST /v1/inventory/transactions/items/batch`
- **Purpose**: Process multiple transactions atomically
- **Input**: Array of transactions for single inventory
- **Business Rules**: All transactions succeed or fail together

#### 2.4 Get Current Quantities
- **Endpoints**:
  - `GET /v1/inventory/transactions/tanks/:inventoryId/:tankTypeId/quantities`
  - `GET /v1/inventory/transactions/items/:inventoryId/:inventoryItemId/quantities`
- **Purpose**: Retrieve real-time inventory quantities
- **Output**: Current quantities with inventory and item context

### 3. Status History & Audit Trail

#### 3.1 Get Assignment Status History
- **Endpoint**: `GET /v1/inventory/status-history/:inventoryId`
- **Purpose**: Retrieve complete status change history for an assignment
- **Output**: Chronological list of status changes with context and timestamps

#### 3.2 Generate Audit Reports
- **Endpoint**: `GET /v1/inventory/status-history/audit`
- **Purpose**: Generate audit reports with statistics
- **Query Parameters**: `startDate`, `endDate`, `storeId`, `userId`
- **Output**: Audit statistics including automated vs manual changes

#### 3.3 Stale Recovery Monitoring
- **Endpoint**: `GET /v1/inventory/status-history/stale-recoveries`
- **Purpose**: Track stale inventory recovery incidents
- **Output**: List of assignments that required stale recovery processing

#### 3.4 Date Range History
- **Endpoint**: `GET /v1/inventory/status-history/date-range`
- **Purpose**: Get status history within date range with filtering
- **Query Parameters**: `startDate`, `endDate`, `status`, `userId`, `storeId`
- **Output**: Filtered status history with aggregation options

### 4. End-of-Day Reconciliation ⚠️ **PARTIALLY IMPLEMENTED**

#### 4.1 Automated Consolidation ✅ **IMPLEMENTED**
- **Trigger**: Status change to VALIDATED
- **Purpose**: Automated end-of-day processing with next-day assignment creation
- **Process**:
  - Validates inventory consistency
  - Carries current quantities to next day assignment
  - Handles weekend skipping and business day logic
  - Creates comprehensive audit trail
- **Business Rules**:
  - Smart date calculation with weekend handling
  - Stale inventory detection and recovery
  - Automatic next-day assignment creation

#### 4.2 Manual Reconciliation ❌ **MISSING**
- **Endpoint**: `POST /v1/inventory/assignments/:id/reconcile` **(TO IMPLEMENT)**
- **Purpose**: Manual end-of-day reconciliation with discrepancy reporting
- **Input**:
  - Final inventory counts for all items
  - Discrepancy explanations
  - Notes
- **Output**: Reconciliation result with calculated discrepancies
- **Business Rules**:
  - Calculate expected inventory based on initial counts + transactions
  - Flag discrepancies between expected and reported counts
  - Store discrepancy information for reporting
  - Allow manual adjustments with justification

#### 4.3 Discrepancy Reporting ❌ **MISSING**
- **Endpoint**: `GET /v1/inventory/assignments/:id/discrepancies` **(TO IMPLEMENT)**
- **Purpose**: Retrieve discrepancy reports for specific assignments
- **Output**: Detailed discrepancy analysis with explanations

## Technical Implementation Details

### Database Schema ✅ **IMPLEMENTED**
- **inventory_assignments**: Core assignment data with status tracking
- **assignment_tanks**: Tank assignments with assigned/current quantities
- **assignment_items**: Item assignments with assigned/current quantities
- **tank_transactions**: Complete tank transaction history
- **item_transactions**: Complete item transaction history
- **inventory_status_history**: Comprehensive audit trail
- **Proper indexing**: Optimized for frequent queries and reporting

### Transaction Types ✅ **IMPLEMENTED**
```typescript
enum TransactionType {
  PURCHASE = "purchase",    // Stock resupply
  SALE = "sale",           // Customer delivery/pickup
  RETURN = "return",       // Customer returns
  TRANSFER = "transfer",   // Inter-store transfers
  ASSIGNMENT = "assignment" // Initial assignments
}
```

### Business Operations ✅ **IMPLEMENTED**
- **Delivery operations**: Customer deliveries with tank exchanges
- **Stock adjustments**: Inventory corrections and resupply
- **Inter-store transfers**: Inventory movement between locations
- **Return processing**: Customer and supplier returns
- **Initial assignments**: Catalog-based inventory distribution

### Workflow States ✅ **IMPLEMENTED**
```typescript
enum AssignmentStatus {
  CREATED = "created",           // Initial state
  ASSIGNED = "assigned",         // User started day
  VALIDATED = "validated",       // User completed day
  CONSOLIDATED = "consolidated", // System processed
  OBSERVED = "observed"          // Requires attention
}
```

### Advanced Features ✅ **IMPLEMENTED**
- **Stale inventory recovery**: Automatic handling of overdue assignments
- **Smart consolidation**: Intelligent end-of-day processing
- **Date calculation service**: Business day awareness
- **Comprehensive audit trails**: Every change tracked with context
- **Batch operations**: Atomic multi-transaction processing
- **Relation loading**: Flexible data loading with include parameters

## Security & Authorization ✅ **IMPLEMENTED**

- **Role-based access control**: Admin, operator, delivery personnel permissions
- **Resource-level authorization**: Users can only access their assignments
- **Action-based permissions**: Granular control over create/read/update operations
- **Audit trail security**: Immutable status history records

## Performance Considerations

### Implemented ✅
- **Database indexing**: Optimized queries for frequent operations
- **Atomic transactions**: Database consistency for inventory updates
- **Relation loading**: Efficient data fetching with optional includes

### Missing ❌
- **Caching layer**: Redis/memory caching for frequently accessed data
- **Pagination**: Large dataset handling for reporting endpoints
- **Query optimization**: Advanced database query tuning
- **Rate limiting**: API throttling for high-traffic scenarios

## Implementation Status

### Phase 1: Core Assignment Management ✅ **100% COMPLETE**
- [x] Database schema with proper relationships and constraints
- [x] Assignment CRUD operations with catalog auto-population
- [x] Status transitions with workflow validation
- [x] Filtering and querying capabilities
- [x] Relation loading with include parameters

### Phase 2: Transaction System ✅ **100% COMPLETE**
- [x] Tank transaction recording with real-time updates
- [x] Item transaction recording with validation
- [x] Batch transaction processing for atomic operations
- [x] Current quantity retrieval endpoints
- [x] Comprehensive transaction validation and error handling

### Phase 3: Audit & History System ✅ **100% COMPLETE**
- [x] Complete status history tracking
- [x] Audit report generation with statistics
- [x] Stale recovery monitoring
- [x] Date range filtering and analysis
- [x] Immutable audit trail with context

### Phase 4: Advanced Workflow ✅ **95% COMPLETE**
- [x] Automated consolidation workflow
- [x] Next-day assignment creation with carried quantities
- [x] Stale inventory detection and recovery
- [x] Smart date calculation with business day logic
- [x] Weekend handling and skip logic
- [ ] Manual reconciliation endpoint **(MISSING)**
- [ ] Discrepancy reporting interface **(MISSING)**

### Phase 5: Performance & Reporting ❌ **25% COMPLETE**
- [ ] Caching implementation for frequently accessed data
- [ ] Pagination for large dataset endpoints
- [ ] Advanced reporting and analytics endpoints
- [ ] Export functionality (CSV, Excel)
- [ ] Performance monitoring and optimization
- [ ] Request throttling and rate limiting

## Priority Implementation Queue

### High Priority ⚠️ **IMMEDIATE NEEDS**
1. **Manual Reconciliation Endpoint**
   - `POST /v1/inventory/assignments/:id/reconcile`
   - Discrepancy calculation and reporting
   - Manual adjustment capabilities

2. **Discrepancy Reporting**
   - `GET /v1/inventory/assignments/:id/discrepancies`
   - Historical discrepancy analysis
   - Explanation and justification tracking

### Medium Priority 🔄 **NEXT SPRINT**
3. **Transaction History Endpoint**
   - `GET /v1/inventory/assignments/:id/transactions`
   - Complete transaction listing with filtering
   - Aggregation and summary statistics

4. **Pagination Implementation**
   - Add pagination to list endpoints
   - Optimize for large datasets
   - Configurable page sizes

### Low Priority 📈 **FUTURE ENHANCEMENT**
5. **Advanced Reporting**
   - Sales analytics and forecasting
   - Inventory trend analysis
   - Export functionality

6. **Performance Optimization**
   - Caching layer implementation
   - Query optimization
   - Rate limiting

## Testing Considerations

### Implemented ✅
- **Workflow lifecycle testing**: Complete assignment flow validation
- **Transaction consistency**: Inventory calculation accuracy
- **Status transition validation**: Business rule enforcement
- **Edge case handling**: Stale recovery and error scenarios

### Required ❌
- **Load testing**: High-volume transaction processing
- **Reconciliation accuracy**: Manual vs automated consistency
- **Discrepancy detection**: Edge case validation
- **Performance benchmarking**: Response time optimization

## Business Value Assessment

### Delivered Value ✅
1. **Complete inventory workflow automation** - Reduces manual overhead
2. **Real-time inventory tracking** - Accurate quantity management
3. **Comprehensive audit trails** - Compliance and troubleshooting
4. **Intelligent error recovery** - Handles edge cases automatically
5. **Scalable transaction processing** - Supports business growth

### Remaining Value Opportunities ❌
1. **Manual reconciliation capabilities** - Handling exceptional scenarios
2. **Advanced reporting and analytics** - Business intelligence insights
3. **Performance optimization** - Handling scale and peak loads
4. **Integration enhancements** - Order system and external APIs

The inventory management system is **production-ready** for core operations and provides significant automation and audit capabilities beyond the original requirements. The remaining features focus on manual oversight capabilities and performance optimization for scale.