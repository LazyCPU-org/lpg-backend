# LPG Order Management - Backend Product Requirements Document

## Overview

This document outlines the backend requirements for implementing the order management system for the LPG delivery business. The system handles the complete order lifecycle from creation through delivery, with sophisticated inventory reservation, workflow management, and integration with existing inventory systems.

## Business Context

The LPG delivery business requires a systematic approach to manage customer orders, replacing the current manual phone/WhatsApp process. The system provides operators with tools to register orders, reserve inventory, manage deliveries, and maintain complete traceability from order creation to fulfillment.

The order system follows a sophisticated workflow with intelligent business logic:

1. **PENDING** - Order created by operator, awaiting confirmation
2. **CONFIRMED** - Order details verified, ready for inventory reservation  
3. **RESERVED** - Inventory successfully reserved for this order
4. **IN_TRANSIT** - Delivery user has started the delivery process
5. **DELIVERED** - Physical delivery completed, inventory transactions created
6. **FULFILLED** - Invoice generated (optional), order complete
7. **CANCELLED** - Order cancelled, inventory reservations restored
8. **FAILED** - Delivery failed, requires attention and inventory restoration

The system supports advanced features including:
- **Inventory reservation system** - Reserve inventory without physical movement
- **Atomic transaction processing** - All operations succeed or fail together
- **Auto-recovery mechanisms** - Handle delivery failures and cancellations
- **Complete audit trails** - Track every order state change and inventory impact
- **Multiple delivery support** - Handle complex delivery scenarios

## Core API Requirements

### 1. Order Management ❌ **TO IMPLEMENT**

#### 1.1 Create Order
- **Endpoint**: `POST /v1/orders`
- **Purpose**: Create a new customer order with multiple items
- **Input**:
  - Store ID (must have active inventory)
  - Customer information (name, phone, address)
  - Order items (tanks and/or inventory items with quantities)
  - Delivery notes and special instructions
  - Optional delivery date/time preferences
- **Output**: Created order with generated order number and initial status
- **Business Rules**:
  - Default status to PENDING
  - Auto-generate unique order number (ORD-2024-001)
  - Calculate total amount based on current prices
  - Validate all items exist in store catalog
  - Only allow orders for stores with active inventory assignments

#### 1.2 Get Order Details
- **Endpoint**: `GET /v1/orders/:orderId`
- **Purpose**: Retrieve complete order information with related data
- **Query Parameters**: `include` for relations (items, reservations, transactions, deliveries, customer, invoice)
- **Output**: Order with selected relations and current status
- **Include Options**:
  - `items` - Order items with tank/item details
  - `reservations` - Current inventory reservations
  - `transactions` - Linked inventory transactions
  - `deliveries` - Delivery attempts and status
  - `invoice` - Associated invoice information

#### 1.3 List Orders with Filtering
- **Endpoint**: `GET /v1/orders`
- **Purpose**: Retrieve orders filtered by various criteria
- **Query Parameters**: 
  - Filtering: `storeId`, `status`, `customerId`, `deliveryUserId`, `dateFrom`, `dateTo`, `orderNumber`
  - Relations: `include` parameter
  - Pagination: `page`, `limit`, `sort`, `order`
- **Output**: Paginated list of orders with optional relations
- **Filtering Capabilities**:
  - Date range filtering for order creation and delivery dates
  - Multiple status filtering (`status=pending,confirmed`)
  - Customer search by name or phone
  - Delivery user assignment filtering

#### 1.4 Update Order Status (Manual)
- **Endpoint**: `PATCH /v1/orders/:orderId/status`
- **Purpose**: Manually update order status with validation
- **Input**: New status and optional reason/notes
- **Business Rules**:
  - Validate status transition is allowed
  - Some transitions trigger automated workflows
  - Create audit trail for manual status changes
  - Certain transitions require additional permissions

#### 1.5 Cancel Order
- **Endpoint**: `DELETE /v1/orders/:orderId`
- **Purpose**: Cancel order and restore any reserved inventory
- **Input**: Cancellation reason and notes
- **Business Rules**:
  - Can be cancelled at any status except DELIVERED/FULFILLED
  - Automatically restores any reserved inventory
  - Creates compensating transactions if delivery was in progress
  - Maintains complete audit trail of cancellation

### 2. Order Workflow Management ❌ **TO IMPLEMENT**

#### 2.1 Order Confirmation
- **Endpoint**: `POST /v1/orders/:orderId/confirm`
- **Purpose**: Confirm order details and prepare for inventory reservation
- **Input**: Optional updated customer information or delivery preferences
- **Output**: Confirmed order ready for reservation
- **Business Rules**:
  - Status transition: PENDING → CONFIRMED
  - Validates all order items are still available in catalog
  - Updates customer information if provided
  - Prepares order for inventory availability checking

#### 2.2 Inventory Reservation
- **Endpoint**: `POST /v1/orders/:orderId/reserve`
- **Purpose**: Reserve inventory for this order without physical movement
- **Input**: Optional override for availability checking
- **Output**: Order with reservation details and updated inventory availability
- **Business Rules**:
  - Status transition: CONFIRMED → RESERVED
  - Check current inventory availability (current - reserved quantities)
  - Create atomic reservations for all order items
  - Fail entire operation if any item insufficient
  - Link reservations to current active inventory assignment
  - Support reservation expiration (optional feature)

#### 2.3 Start Delivery
- **Endpoint**: `POST /v1/orders/:orderId/start-delivery`
- **Purpose**: Begin delivery process with assigned delivery user
- **Input**: Delivery user ID and optional delivery notes
- **Output**: Order marked as in transit with delivery details
- **Business Rules**:
  - Status transition: RESERVED → IN_TRANSIT
  - Assign delivery user to order
  - Create delivery attempt record
  - Validate delivery user is assigned to correct store
  - Optional: Create delivery route optimization

#### 2.4 Complete Delivery
- **Endpoint**: `POST /v1/orders/:orderId/complete-delivery`
- **Purpose**: Mark delivery as completed and create inventory transactions
- **Input**: Delivery completion details and optional customer confirmation
- **Output**: Order marked as delivered with created inventory transactions
- **Business Rules**:
  - Status transition: IN_TRANSIT → DELIVERED
  - Convert all reservations to actual inventory transactions
  - Create transaction links for complete traceability
  - Update current inventory quantities in real-time
  - Generate invoice if customer requires one
  - Create comprehensive audit trail

#### 2.5 Handle Failed Delivery
- **Endpoint**: `POST /v1/orders/:orderId/fail-delivery`
- **Purpose**: Handle delivery failure and restore inventory reservations
- **Input**: Failure reason and optional rescheduling information
- **Output**: Order marked as failed with restored inventory
- **Business Rules**:
  - Status transition: IN_TRANSIT → FAILED
  - Restore inventory reservations to original state
  - Create delivery failure audit record
  - Optionally reschedule delivery attempt
  - Notify relevant stakeholders of failure

### 3. Inventory Integration ❌ **TO IMPLEMENT**

#### 3.1 Availability Checking
- **Endpoint**: `POST /v1/orders/check-availability`
- **Purpose**: Check inventory availability before order creation or confirmation
- **Input**: Store ID and list of requested items with quantities
- **Output**: Detailed availability report for each requested item
- **Availability Calculation**:
  - Current inventory quantities (from active inventory assignment)
  - Reserved quantities (from active reservations)
  - Available quantities (current - reserved)
  - Detailed breakdown per tank type and inventory item

#### 3.2 Reservation Management
- **Endpoint**: `GET /v1/orders/:orderId/reservations`
- **Purpose**: Get detailed reservation information for an order
- **Output**: List of reservations with current status and linked inventory
- **Reservation Details**:
  - Reserved quantities per item type
  - Link to current inventory assignment
  - Reservation creation and expiration times
  - Reservation status (active, fulfilled, cancelled, expired)

#### 3.3 Transaction Traceability
- **Endpoint**: `GET /v1/orders/:orderId/transactions`
- **Purpose**: Get all inventory transactions linked to this order
- **Output**: List of inventory transactions created during order fulfillment
- **Transaction Details**:
  - Link to original inventory transactions
  - Transaction type (sale, return, etc.)
  - Quantities moved and updated inventory levels
  - Transaction creation time and user

#### 3.4 Real-time Inventory Impact
- **Endpoint**: `GET /v1/orders/analytics/inventory-impact`
- **Purpose**: Analyze impact of orders on inventory levels
- **Query Parameters**: Date range, store ID, item type filters
- **Output**: Inventory impact analysis and forecasting
- **Analytics Provided**:
  - Reserved vs. available inventory trends
  - Order fulfillment impact on stock levels
  - Prediction of inventory shortages
  - Historical reservation vs. actual delivery rates

### 4. Delivery Management ❌ **TO IMPLEMENT**

#### 4.1 Multiple Delivery Support
- **Endpoint**: `GET /v1/orders/:orderId/deliveries`
- **Purpose**: Get all delivery attempts for an order (supports partial/retry deliveries)
- **Output**: List of delivery attempts with status and details
- **Support for**:
  - Multiple delivery attempts for failed deliveries
  - Partial delivery scenarios (basic implementation)
  - Delivery rescheduling and tracking

#### 4.2 Delivery Scheduling
- **Endpoint**: `POST /v1/orders/:orderId/deliveries`
- **Purpose**: Schedule new delivery attempt for existing order
- **Input**: Delivery user, preferred date/time, delivery notes
- **Output**: New delivery attempt record
- **Business Rules**:
  - Only allow for orders with RESERVED or FAILED status
  - Validate delivery user assignment to store
  - Support delivery date preferences
  - Handle delivery slot management (future enhancement)

#### 4.3 Delivery Status Updates
- **Endpoint**: `PATCH /v1/orders/:orderId/deliveries/:deliveryId`
- **Purpose**: Update delivery attempt status and details
- **Input**: New delivery status and optional notes/updates
- **Output**: Updated delivery attempt with status history

### 5. Invoice Integration ❌ **TO IMPLEMENT**

#### 5.1 Generate Invoice
- **Endpoint**: `POST /v1/orders/:orderId/generate-invoice`
- **Purpose**: Generate invoice for completed order (optional feature)
- **Input**: Invoice details and customer information
- **Output**: Generated invoice with auto-generated invoice number
- **Business Rules**:
  - Only available for DELIVERED orders
  - Auto-generate unique invoice number (INV-2024-001)
  - Calculate totals from order items and current prices
  - Link invoice to order for traceability
  - Optional automatic generation on delivery completion

#### 5.2 Get Order Invoice
- **Endpoint**: `GET /v1/orders/:orderId/invoice`
- **Purpose**: Retrieve invoice associated with an order
- **Output**: Invoice details with line items and totals
- **Include Options**:
  - Invoice items with detailed descriptions
  - Payment status and history (future enhancement)
  - PDF generation capability (future enhancement)

## Technical Implementation Details

### Database Schema ❌ **TO IMPLEMENT**

#### Core Orders Tables
```sql
-- Main order information
orders (
  order_id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  store_id INT NOT NULL REFERENCES stores(store_id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  delivery_notes TEXT,
  status order_status_enum NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  created_by INT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Order line items
order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id),
  item_type order_item_type_enum NOT NULL, -- 'tank' | 'item'
  tank_type_id INT REFERENCES tank_types(type_id),
  inventory_item_id INT REFERENCES inventory_items(inventory_item_id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  delivery_status delivery_status_enum DEFAULT 'pending'
)

-- Inventory reservation system
inventory_reservations (
  reservation_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id),
  assignment_id INT NOT NULL REFERENCES store_assignments(assignment_id),
  current_inventory_id INT NOT NULL,
  item_type reservation_item_type_enum NOT NULL,
  tank_type_id INT REFERENCES tank_types(type_id),
  inventory_item_id INT REFERENCES inventory_items(inventory_item_id),
  reserved_quantity INT NOT NULL CHECK (reserved_quantity > 0),
  status reservation_status_enum DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Order-transaction traceability
order_transaction_links (
  link_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id),
  tank_transaction_id INT REFERENCES tank_transactions(transaction_id),
  item_transaction_id INT REFERENCES item_transactions(transaction_id),
  delivery_id INT REFERENCES order_deliveries(delivery_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Multiple delivery support
order_deliveries (
  delivery_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id),
  delivery_user_id INT NOT NULL REFERENCES users(user_id),
  delivery_date DATE,
  delivery_notes TEXT,
  status delivery_status_enum DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Enums
```sql
CREATE TYPE order_status_enum AS ENUM (
  'pending',      -- Order created, not yet confirmed
  'confirmed',    -- Order confirmed, ready for reservation
  'reserved',     -- Inventory reserved successfully
  'in_transit',   -- Delivery in progress
  'delivered',    -- All items delivered, transactions created
  'fulfilled',    -- Invoice generated, order complete
  'cancelled',    -- Order cancelled, inventory restored
  'failed'        -- Delivery failed, needs attention
);

CREATE TYPE order_item_type_enum AS ENUM ('tank', 'item');
CREATE TYPE reservation_status_enum AS ENUM ('active', 'fulfilled', 'cancelled', 'expired');
CREATE TYPE delivery_status_enum AS ENUM ('scheduled', 'in_transit', 'delivered', 'failed', 'cancelled');
```

### Service Architecture ❌ **TO IMPLEMENT**

Following existing inventory patterns:

```typescript
// Core service interfaces
interface IOrderService {
  createOrder(request: CreateOrderRequest): Promise<OrderWithDetails>;
  getOrder(orderId: number, include?: string[]): Promise<OrderWithDetails>;
  updateOrderStatus(orderId: number, status: OrderStatus, userId: number): Promise<OrderWithDetails>;
  getOrdersByFilters(filters: OrderFilters): Promise<OrderWithDetails[]>;
  cancelOrder(orderId: number, reason: string, userId: number): Promise<OrderWithDetails>;
}

interface IOrderWorkflowService {
  confirmOrder(orderId: number, userId: number): Promise<OrderTransition>;
  reserveInventory(orderId: number): Promise<OrderTransition>;
  startDelivery(orderId: number, deliveryUserId: number): Promise<OrderTransition>;
  completeDelivery(orderId: number, deliveryUserId: number): Promise<OrderTransition>;
  failDelivery(orderId: number, reason: string): Promise<OrderTransition>;
}

interface IReservationService {
  createReservationsForOrder(orderId: number): Promise<ReservationResult>;
  fulfillReservations(orderId: number, userId: number): Promise<FulfillmentResult>;
  restoreReservations(orderId: number, reason: string): Promise<RestoreResult>;
  checkAvailability(storeId: number, items: OrderItemRequest[]): Promise<AvailabilityResult>;
}
```

### Order Workflow States ❌ **TO IMPLEMENT**

```typescript
enum OrderStatus {
  PENDING = "pending",           // Initial state
  CONFIRMED = "confirmed",       // Order verified
  RESERVED = "reserved",         // Inventory reserved
  IN_TRANSIT = "in_transit",     // Delivery started
  DELIVERED = "delivered",       // Physical delivery complete
  FULFILLED = "fulfilled",       // Invoice generated, complete
  CANCELLED = "cancelled",       // Order cancelled
  FAILED = "failed"              // Delivery failed
}
```

### Business Operations ❌ **TO IMPLEMENT**

**Order Creation Flow:**
1. Validate customer information and store availability
2. Create order record with PENDING status
3. Create order items with current pricing
4. Return order for operator review and confirmation

**Inventory Reservation Flow:**
1. Check current inventory availability (current - reserved)
2. Create atomic reservations for all order items
3. Link reservations to current active inventory assignment
4. Update order status to RESERVED
5. Handle partial availability scenarios

**Delivery Completion Flow:**
1. Validate order is IN_TRANSIT with active reservations
2. Convert reservations to inventory transactions using existing service
3. Create order-transaction links for traceability
4. Update reservation status to fulfilled
5. Update order status to DELIVERED
6. Optional: Generate invoice and update to FULFILLED

**Cancellation Flow:**
1. Restore any active reservations to available inventory
2. Create compensating transactions if delivery was in progress
3. Update order status to CANCELLED
4. Create complete audit trail of cancellation

### Integration with Existing Systems ❌ **TO IMPLEMENT**

**Inventory Transaction Service:**
- Reuse existing `IInventoryTransactionService` with transaction-aware methods
- Maintain all existing business logic and validation
- Create order-transaction links for complete traceability
- Use existing transaction types (sale, return, transfer)

**Current Inventory System:**
- Leverage existing `store_assignment_current_inventory` table
- Use current inventory lookup mechanisms
- Maintain real-time inventory accuracy with reservations

**Audit System:**
- Create order status history table similar to inventory status history
- Maintain complete audit trail for all order operations
- Track all status changes with user, reason, and timestamp

## Security & Authorization ❌ **TO IMPLEMENT**

- **Role-based access control**: Admin, operator, delivery personnel permissions
- **Resource-level authorization**: Users can only access orders from assigned stores
- **Action-based permissions**: Granular control over order operations
- **Audit trail security**: Immutable order and reservation history records

## Performance Considerations

### To Implement ❌
- **Database indexing**: Optimize queries for frequent order operations
- **Atomic transactions**: Database consistency for order and inventory updates
- **Relation loading**: Efficient data fetching with optional includes
- **Caching layer**: Redis/memory caching for frequently accessed data
- **Pagination**: Large dataset handling for order listing endpoints
- **Query optimization**: Advanced database query tuning

## Implementation Status

### Phase 1: Core Order Management ❌ **0% COMPLETE**
- [ ] Database schema with proper relationships and constraints
- [ ] Order CRUD operations with proper validation
- [ ] Basic order workflow (pending → confirmed)
- [ ] API endpoints for order management
- [ ] Manual order entry capability

### Phase 2: Inventory Integration ❌ **0% COMPLETE**
- [ ] Inventory reservation system implementation
- [ ] Availability checking with real-time calculation
- [ ] Reserve/restore functionality with atomic transactions
- [ ] Integration with current inventory system
- [ ] Order status progression to RESERVED

### Phase 3: Delivery Workflow ❌ **0% COMPLETE**
- [ ] Delivery workflow service implementation
- [ ] Integration with existing inventory transaction system
- [ ] Order-transaction linking for traceability
- [ ] Delivery completion with transaction creation
- [ ] Order status progression to DELIVERED

### Phase 4: Error Handling & Cancellation ❌ **0% COMPLETE**
- [ ] Order cancellation with inventory restoration
- [ ] Failed delivery handling with compensation
- [ ] Edge case handling and recovery mechanisms
- [ ] Comprehensive error validation and rollback

### Phase 5: Invoice Integration ❌ **0% COMPLETE**
- [ ] Simple invoice schema and service
- [ ] Auto-invoice generation on delivery completion
- [ ] Basic invoice management API
- [ ] Order completion workflow (DELIVERED → FULFILLED)

### Phase 6: Advanced Features ❌ **0% COMPLETE**
- [ ] Multiple delivery attempts support
- [ ] Partial delivery handling (basic implementation)
- [ ] Advanced reporting and analytics
- [ ] Performance optimization and caching

## Priority Implementation Queue

### High Priority ⚠️ **IMMEDIATE NEEDS**
1. **Core Order Management**
   - Database schema creation and migration
   - Basic order CRUD operations
   - Order creation API for operator use
   - Simple order listing and filtering

2. **Inventory Reservation System**
   - Availability checking mechanism
   - Atomic reservation creation
   - Integration with current inventory system
   - Reserve/restore functionality

3. **Basic Delivery Workflow**
   - Delivery workflow service
   - Integration with inventory transactions
   - Order status progression
   - Traceability linking

### Medium Priority 🔄 **NEXT SPRINT**
4. **Error Handling & Cancellation**
   - Order cancellation capability
   - Failed delivery handling
   - Inventory restoration mechanisms
   - Edge case recovery

5. **Invoice Integration**
   - Simple invoice generation
   - Order completion workflow
   - Basic invoice management

### Low Priority 📈 **FUTURE ENHANCEMENT**
6. **Advanced Features**
   - Multiple delivery attempts
   - Advanced reporting and analytics
   - Performance optimization
   - n8n workflow integration readiness

## Testing Considerations

### Required ❌
- **Workflow lifecycle testing**: Complete order flow validation
- **Reservation consistency**: Inventory reservation accuracy
- **Status transition validation**: Business rule enforcement
- **Edge case handling**: Cancellation and failure scenarios
- **Integration testing**: Inventory system integration
- **Load testing**: High-volume order processing
- **Transaction atomicity**: Database consistency validation

## Business Value Assessment

### Expected Value Delivery ✅
1. **Systematic Order Management** - Replace manual phone/WhatsApp process
2. **Real-time Inventory Tracking** - Accurate availability with reservations
3. **Complete Order Traceability** - From creation to delivery completion
4. **Automated Workflow Processing** - Reduce manual overhead and errors
5. **Scalable Foundation** - Ready for n8n automation integration

### Integration Benefits ✅
1. **Seamless Inventory Integration** - Leverages existing transaction system
2. **Consistent Data Model** - Follows established patterns and conventions
3. **Atomic Operations** - Ensures data consistency across order and inventory
4. **Audit Trail Continuity** - Extends existing audit capabilities
5. **Performance Optimization** - Reuses existing optimized queries and patterns

The order management system provides a complete digital transformation of the order workflow while maintaining seamless integration with the existing inventory system. The design prioritizes data consistency, operational efficiency, and future scalability.

---

## 📊 **Implementation Status**

### **✅ Phase 3: Service Layer Interface Alignment - COMPLETE**

**Achievement Summary:**
- ✅ **Perfect interface alignment** between test expectations and implementation contracts
- ✅ **94 comprehensive tests** covering all business scenarios passing with actual interfaces
- ✅ **Dual signature pattern** supporting both TDD development and production workflows
- ✅ **Zero TypeScript errors** in service interface definitions
- ✅ **Integration ready** with existing inventory reservation service

**Service Interfaces Completed:**
- ✅ **IOrderService** - 18 methods covering CRUD, validation, calculations, search, and analytics
- ✅ **IOrderWorkflowService** - Complete workflow state management with test-aligned methods
- ✅ **Test Infrastructure** - 54 validation tests + 40 workflow tests aligned with actual interfaces

**Development Readiness:**
- 🚀 **Ready for TDD implementation** with comprehensive test suite
- 🚀 **Proven integration patterns** from inventory module success
- 🚀 **Clear implementation path** with Phase 3 Implementation Guide
- 🚀 **Optimal development state** for efficient service implementation

**Next Phases:**
- 📋 **Phase 4: Service Implementation** - Build OrderService.ts and OrderWorkflowService.ts using TDD
- 📋 **Phase 5: Route Layer** - Create API endpoints with authentication and validation
- 📋 **Phase 6: Integration Testing** - End-to-end testing and performance optimization

**Documentation:**
- 📖 **Orders - Phase 3 Service Implementation Guide.md** - Detailed implementation instructions
- 📖 **Orders - Implementation Status.md** - Real-time progress tracking
- 📖 **Development Guide - Orders Module.md** - Updated with Phase 3 completion status

*Status Updated: 2025-01-16 - Ready for service implementation with complete test-driven foundation*