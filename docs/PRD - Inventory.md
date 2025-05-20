# LPG Inventory Management - Backend Product Requirements Document

## Overview

This document outlines the backend requirements for implementing the inventory management system for the LPG delivery business. The system will handle daily inventory assignments, track inventory changes through transactions, and manage the workflow status transitions.

## Business Context

The LPG delivery business assigns tanks and other inventory items to delivery users each day. The inventory follows a workflow:
1. **CREATED** - Initial assignment state
2. **ASSIGNED** - When delivery user starts their day
3. **VALIDATED** - End of day when inventory and sales are reconciled

When a delivery is completed, full tanks are given to customers and empty tanks are collected. Other transactions like resupply can also occur during the day.

## Core API Requirements

### 1. Inventory Assignment Management

#### 1.1 Create Inventory Assignment
- **Endpoint**: `POST /api/inventory/assignments`
- **Purpose**: Create a new daily inventory assignment for a user
- **Input**:
  - User ID
  - Store ID
  - Assignment date
  - Initial inventory items (tanks and other items)
- **Output**: Created assignment with ID
- **Business Rules**:
  - Default status to CREATED
  - Initial `current` counts should match `assigned` counts
  - Only allow for users assigned to the store

#### 1.2 Get Inventory Assignment
- **Endpoint**: `GET /api/inventory/assignments/:id`
- **Purpose**: Retrieve full details of an inventory assignment
- **Output**: Assignment with all associated tanks and items

#### 1.3 Get Inventory Assignments By Filters
- **Endpoint**: `GET /api/inventory/assignments`
- **Purpose**: Retrieve assignments filtered by user, store, date, and/or status
- **Query Parameters**: userId, storeId, date, status
- **Output**: List of matching assignments

#### 1.4 Update Assignment Status
- **Endpoint**: `PATCH /api/inventory/assignments/:id/status`
- **Purpose**: Change the status of an assignment
- **Input**: New status
- **Business Rules**:
  - Only allow valid transitions (CREATED → ASSIGNED → VALIDATED)
  - When changing to VALIDATED:
    - Verify inventory matches transactions
    - Auto-create next day's assignment with CREATED status

### 2. Inventory Transactions

#### 2.1 Record Tank Transaction
- **Endpoint**: `POST /api/inventory/transactions/tanks`
- **Purpose**: Record changes to tank inventory
- **Input**:
  - Assignment ID
  - Transaction type (SALE, PURCHASE, RETURN, TRANSFER)
  - Full tanks change (positive or negative)
  - Empty tanks change (positive or negative)
  - Notes
- **Business Rules**:
  - Update current inventory counts on the assignment
  - Validate that transaction doesn't result in negative inventory

#### 2.2 Record Item Transaction
- **Endpoint**: `POST /api/inventory/transactions/items`
- **Purpose**: Record changes to non-tank inventory items
- **Input**: Similar to tank transaction
- **Business Rules**: Similar to tank transaction

#### 2.3 Get Transactions for Assignment
- **Endpoint**: `GET /api/inventory/assignments/:id/transactions`
- **Purpose**: Retrieve all transactions for a specific assignment
- **Output**: List of transactions with details

### 3. End-of-Day Reconciliation

#### 3.1 Submit End-of-Day Report
- **Endpoint**: `POST /api/inventory/assignments/:id/reconcile`
- **Purpose**: Submit final inventory counts and validate the day
- **Input**:
  - Final inventory counts for all items
  - Notes
- **Output**: Reconciliation result with any discrepancies
- **Business Rules**:
  - Calculate expected inventory based on initial counts + transactions
  - Flag any discrepancies between expected and reported counts
  - Store discrepancy information for reporting

#### 3.2 Auto-Create Next Day Assignment
- **Endpoint**: Internal function called by reconciliation process
- **Purpose**: Create next day's assignment automatically
- **Business Rules**:
  - Copy current inventory counts to new assignment's starting counts
  - Set status to CREATED
  - Use next calendar day for assignment date

## Technical Requirements

### Database Considerations
- Ensure proper indexing on frequently queried fields (assignmentId, userId, storeId, assignmentDate)
- Consider adding transaction locking for inventory updates to prevent race conditions

### Performance Requirements
- API response times should be under 500ms for all endpoints
- Optimize transaction queries for high-volume operations

### Security
- Ensure proper authorization checks:
  - Admins can view and modify all assignments
  - Delivery users can only view and update their own assignments
  - Only allow status changes by authorized roles

## Implementation Checklist

### Phase 1: Core Assignment Management
- [x] Database Schema Implementation
  - [x] Create inventory_assignments table
  - [x] Create assignment_tanks table
  - [x] Create assignment_items table
  - [x] Set up proper relationships and constraints
  - [x] Implement indexes for performance

- [x] Assignment Creation
  - [x] Implement `POST /api/inventory/assignments` endpoint
  - [x] Create database functions for assignment creation
  - [x] Implement validation for user-store relationship
  - [x] Setup initial tank and item assignment

- [x] Assignment Retrieval
  - [x] Implement `GET /api/inventory/assignments/:id` endpoint
  - [x] Create database queries with proper joins
  - [x] Add filtering support by user, store, and date
  - [x] Implement `GET /api/inventory/assignments` with filters

- [x] Basic Status Transitions
  - [x] Implement `PATCH /api/inventory/assignments/:id/status` endpoint
  - [x] Add validation for status transitions
  - [x] Create status update database functions

### Phase 2: Transaction System
- [ ] Transaction Recording - Tanks
  - [ ] Implement `POST /api/inventory/transactions/tanks` endpoint
  - [ ] Create transaction validation rules
  - [ ] Implement inventory update logic
  - [ ] Add safeguards against negative inventory

- [ ] Transaction Recording - Items
  - [ ] Implement `POST /api/inventory/transactions/items` endpoint
  - [ ] Create item transaction validation
  - [ ] Implement inventory update logic for items

- [ ] Transaction History
  - [ ] Implement `GET /api/inventory/assignments/:id/transactions` endpoint
  - [ ] Add filtering and pagination support
  - [ ] Create queries for transaction aggregation
  - [ ] Implement sorting options

### Phase 3: End-of-Day Process
- [ ] Reconciliation Process
  - [ ] Implement `POST /api/inventory/assignments/:id/reconcile` endpoint
  - [ ] Create expected vs. actual calculation logic
  - [ ] Add discrepancy detection
  - [ ] Implement notes and explanation storage

- [ ] Auto-Creation for Next Day
  - [ ] Create function to generate next day's assignment
  - [ ] Implement inventory copying from current to new assignment
  - [ ] Add scheduling mechanism for automatic creation
  - [ ] Implement status transition to VALIDATED

- [ ] Discrepancy Handling
  - [ ] Create discrepancy storage schema
  - [ ] Implement reporting for discrepancies
  - [ ] Add admin notification for significant discrepancies

### Phase 4: Optimization and Reporting
- [ ] Batch Operations
  - [ ] Create endpoints for batch status updates
  - [ ] Implement bulk transaction processing
  - [ ] Add validation for batch operations

- [ ] Performance Optimization
  - [ ] Add caching for frequently accessed data
  - [ ] Optimize database queries and indexes
  - [ ] Implement pagination for large result sets
  - [ ] Add request throttling if needed

- [ ] Advanced Reporting
  - [ ] Create endpoints for inventory history reporting
  - [ ] Implement aggregation for sales analytics
  - [ ] Add forecasting calculations
  - [ ] Create export functionality for reports

## Testing Considerations

- Test complete lifecycle of an assignment from creation to validation
- Verify inventory calculations are correct after multiple transactions
- Ensure status transitions follow business rules
- Test edge cases like inventory shortages or unusual transaction patterns# LPG Inventory Management - Backend Product Requirements Document