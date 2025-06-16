# LPG Orders Module - Development Implementation Guide

## Overview

This guide outlines the complete implementation strategy for the Orders module, which integrates with the existing Inventory system to provide end-to-end order management for the LPG delivery business.

## Business Context

The Orders module enables operators to register customer orders through the system, reserve inventory, manage deliveries, and maintain complete traceability from order creation to fulfillment. This replaces the current manual phone/WhatsApp process and prepares the system for future n8n workflow automation.

## Implementation Strategy

### **Core Integration Principles**

1. **Leverage Existing Architecture**: Build on proven inventory transaction patterns
2. **Atomic Operations**: All order operations use `withTransaction` for data consistency  
3. **Traceability**: Complete audit trail from order creation to inventory movement
4. **Future-Ready**: Designed for both manual operator entry and automated workflows
5. **Simple & Scalable**: Meet current needs without over-engineering

### **Order-Driven Business Flow**

```
Customer Request → Order Creation → Inventory Reservation → Delivery Execution → Inventory Transaction → Invoice Generation
```

**Key Business Rules:**
- Inventory is only physically moved when delivery occurs
- Orders can fail after inventory reservation (restore reserved quantities)
- Most orders are single delivery, but multi-delivery support included
- Invoice generation is optional (few customers require invoices)
- Complete rollback capability for any operation failures

## 🗺️ **Orders Module Implementation Plan**

## **Implementation Order (Bottom-Up Architecture)**

### **Phase 1: Database Foundation** 📊
```
src/db/schemas/orders/
├── orders.ts ✅ (already exists)
├── order-items.ts  
├── order-status-history.ts
├── inventory-reservations.ts
└── order-transaction-links.ts ✅ (already exists)
```

### **Phase 2: Repository Layer** 🗃️
```
src/repositories/orders/
├── IOrderRepository.ts
├── PgOrderRepository.ts
├── IOrderWorkflowRepository.ts  
├── PgOrderWorkflowRepository.ts
├── IInventoryReservationRepository.ts
├── PgInventoryReservationRepository.ts
└── index.ts (barrel exports)
```

### **Phase 3: Service Layer** ⚙️ ✅ **Interface Alignment Complete**
```
src/services/orders/
├── IOrderService.ts ✅              # Test-aligned interface with 18 methods
├── OrderService.ts                  # Implementation (to be built)
├── IOrderWorkflowService.ts ✅      # Dual-signature workflow interface  
├── OrderWorkflowService.ts          # Implementation (to be built)
├── types.ts ✅                      # Common service types
├── index.ts                         # Service exports
└── __tests__/ ✅                    # Complete test infrastructure
    ├── orderValidation.test.ts ✅   # 54 tests aligned with actual interface
    ├── orderWorkflow.test.ts ✅     # 40 tests aligned with actual interface
    └── __mocks__/ ✅                # Test data and repository mocks
```

**🎯 Phase 3 Status:** Interface design and test alignment **COMPLETE**
- ✅ **94 tests passing** with actual interfaces (not mocks)
- ✅ **Perfect interface alignment** between tests and implementation contracts
- ✅ **Dual signature pattern** supporting both TDD and production workflows
- ✅ **Zero TypeScript errors** in service interfaces
- ✅ **Integration ready** with existing inventory reservation service

**📋 See:** `Orders - Phase 3 Service Implementation Guide.md` for detailed implementation instructions

### **Phase 4: Routes Layer** 🛣️
```
src/routes/
├── orderRoutes.ts
└── index.ts (register routes)
```

---

## **Detailed Implementation Sequence**

### **🏗️ Step 1: Complete Database Schemas**
**Where**: `src/db/schemas/orders/`
- Complete missing order item schema  
- Add order status history schema
- Add inventory reservations schema
- Update schema index exports

### **🗃️ Step 2: Repository Interfaces**
**Where**: `src/repositories/orders/IOrderRepository.ts`
```typescript
interface IOrderRepository {
  createOrder(order: NewOrderType): Promise<OrderWithDetails>;
  getOrderById(orderId: number): Promise<OrderWithDetails | null>;
  updateOrderStatus(orderId: number, status: string): Promise<void>;
  // ... other CRUD operations
}
```

### **🗃️ Step 3: Repository Implementations**
**Where**: `src/repositories/orders/PgOrderRepository.ts`
- Implement PostgreSQL-specific database operations
- Use Drizzle ORM with proper relations
- Handle database transactions for atomic operations

### **⚙️ Step 4: Service Interfaces**
**Where**: `src/services/orders/IOrderService.ts`  
```typescript
interface IOrderService {
  createOrder(request: CreateOrderRequest): Promise<OrderWithDetails>;
  validateOrderRequest(request: CreateOrderRequest): Promise<ValidationResult>;
  calculateOrderTotal(items: OrderItemRequest[]): string;
  // ... business logic methods
}
```

### **⚙️ Step 5: Service Implementations** ✅ **Interface Alignment Complete**
**Where**: `src/services/orders/OrderService.ts`
- ✅ **Interface contracts finalized** (IOrderService with 18 methods)
- ✅ **Test-driven development ready** (94 tests aligned with actual interfaces)
- ✅ **Business logic patterns defined** (validation, UX flows, calculations)
- ✅ **Inventory integration patterns established** (reservation service ready)
- 🔄 **Implementation in progress** (follow Phase 3 guide)

**Status**: Ready for TDD implementation with existing test suite

### **🛣️ Step 6: Route Handlers**
**Where**: `src/routes/orderRoutes.ts`
```typescript
router.post('/orders', 
  isAuthenticated,
  requirePermission(ModuleEnum.ORDERS, ActionEnum.CREATE),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const orderData = CreateOrderRequestSchema.parse(req.body);
    const result = await orderService.createOrder(orderData);
    res.status(201).json({ success: true, data: result });
  })
);
```

### **🔌 Step 7: Dependency Injection**
**Where**: Main app setup
- Wire up repositories → services → routes
- Follow your existing inventory pattern

---

## **🎯 Where It Starts and Ends**

### **STARTS**: 
`src/db/schemas/orders/` → Database schema completion

### **FLOWS THROUGH**:
1. **Repository Layer**: Data access abstractions
2. **Service Layer**: Business logic from your tests  
3. **Route Layer**: HTTP API endpoints

### **ENDS**:
```bash
POST /api/v1/orders          # Create order (UX quick entry)
GET  /api/v1/orders          # List orders  
POST /api/v1/orders/:id/confirm    # Workflow transitions
POST /api/v1/orders/check-availability  # Inventory checks
```

---

## **🚀 Implementation Benefits**

✅ **Test-Driven**: Your tests define exact business behavior  
✅ **UX-Aligned**: Handles phone conversation flow seamlessly  
✅ **Repository Pattern**: Clean separation of concerns  
✅ **Inventory Integration**: Leverages existing transaction service  
✅ **Type Safety**: Full TypeScript with proper DTOs  

**Next Action**: Complete the missing database schemas in `src/db/schemas/orders/` to establish the foundation.

## Development Phases

### **Phase 1: Core Order Foundation** 
**Timeline: Week 1-2 | Priority: CRITICAL**

**Deliverables:**
- Database schema creation (orders, order_items, inventory_reservations)
- Order repository with transaction-aware methods
- Basic order service (create, read operations)
- Core API endpoints for order management
- Manual order entry capability for operators

**Database Tables:**
- `orders` - Core order information
- `order_items` - Items within each order (tanks/items)
- `inventory_reservations` - Reserved inventory tracking
- `order_transaction_links` - Traceability between orders and transactions

**API Endpoints:**
- `POST /v1/orders` - Create new order
- `GET /v1/orders/:orderId` - Get order details
- `GET /v1/orders` - List orders with filtering

**Success Criteria:**
- Operators can create orders through API
- Order data is persisted with proper relationships
- Basic order retrieval and filtering works

---

### **Phase 2: Inventory Integration**
**Timeline: Week 2-3 | Priority: HIGH**

**Deliverables:**
- Reservation service implementation
- Current inventory availability checking
- Reserve/restore functionality with atomic transactions
- Integration with existing current inventory system
- Order status progression: PENDING → CONFIRMED → RESERVED

**Core Services:**
- `IReservationService` - Manage inventory reservations
- `IOrderWorkflowService` - Handle status transitions
- Integration with existing `store_assignment_current_inventory` table

**API Endpoints:**
- `POST /v1/orders/check-availability` - Check inventory before order creation
- `POST /v1/orders/:orderId/confirm` - Confirm order
- `POST /v1/orders/:orderId/reserve` - Reserve inventory
- `GET /v1/orders/:orderId/reservations` - Get reservation details

**Business Logic:**
- Available quantity = Current inventory - Reserved inventory
- Atomic reservation creation (all items or none)
- Automatic rollback on insufficient inventory
- Reservation expiration handling (optional)

**Success Criteria:**
- Orders can reserve inventory atomically
- Insufficient inventory prevents reservation
- Inventory availability accurately reflects reservations
- Reservations can be restored on cancellation

---

### **Phase 3: Delivery Workflow**
**Timeline: Week 3-4 | Priority: HIGH**

**Deliverables:**
- Delivery workflow service implementation
- Integration with existing inventory transaction system
- Order-transaction linking for complete traceability
- Order status progression: RESERVED → IN_TRANSIT → DELIVERED

**Core Integration:**
- Reuse existing `IInventoryTransactionService` within order transactions
- Extend transaction service with `*WithTransaction` methods
- Create order-transaction links in `order_transaction_links` table
- Generate transaction records on delivery completion

**API Endpoints:**
- `POST /v1/orders/:orderId/start-delivery` - Start delivery process
- `POST /v1/orders/:orderId/complete-delivery` - Complete delivery
- `GET /v1/orders/:orderId/transactions` - Get linked transactions
- `GET /v1/orders/:orderId/deliveries` - Get delivery history

**Transaction Flow:**
1. Validate order can be delivered
2. Convert reservations to inventory transactions
3. Create order-transaction links
4. Update reservation status to fulfilled
5. Update order status to delivered
6. Create audit records

**Success Criteria:**
- Delivery completion creates proper inventory transactions
- Transaction types match existing system (sale, return, etc.)
- Complete traceability from order to inventory movement
- Atomic delivery operations with rollback capability

---

### **Phase 4: Error Handling & Cancellation**
**Timeline: Week 4 | Priority: MEDIUM**

**Deliverables:**
- Order cancellation with inventory restoration
- Failed delivery handling
- Partial delivery support (basic implementation)
- Edge case handling and recovery

**Error Scenarios:**
- Order cancellation at any status
- Delivery failure after departure
- Partial delivery completion
- Customer unavailable/refuses delivery

**API Endpoints:**
- `DELETE /v1/orders/:orderId` - Cancel order
- `POST /v1/orders/:orderId/fail-delivery` - Mark delivery failed
- `PATCH /v1/orders/:orderId/status` - Manual status updates

**Recovery Mechanisms:**
- Restore reserved inventory on cancellation
- Create compensating transactions for failed deliveries
- Handle partial delivery scenarios
- Maintain audit trail for all operations

**Success Criteria:**
- Orders can be cancelled at any stage
- Failed deliveries restore inventory properly
- Edge cases are handled gracefully
- Complete audit trail maintained

---

### **Phase 5: Invoice Integration**
**Timeline: Week 5 | Priority: LOW**

**Deliverables:**
- Simple invoice schema and service
- Auto-invoice generation on delivery completion
- Basic invoice management API
- Order status progression: DELIVERED → FULFILLED

**Invoice Schema:**
- `invoices` - Basic invoice information
- `invoice_items` - Invoice line items linked to order items

**API Endpoints:**
- `GET /v1/orders/:orderId/invoice` - Get order invoice
- `POST /v1/orders/:orderId/generate-invoice` - Manual invoice generation

**Integration Points:**
- Auto-generate invoice on delivery completion (optional)
- Link invoices to orders and customers
- Basic invoice numbering system

**Success Criteria:**
- Invoices are generated when requested
- Invoice data matches order information
- Invoice generation is optional and configurable

## Technical Architecture

### **Service Layer Design**

```typescript
// Core Service Interfaces
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

### **Repository Pattern**

Following existing inventory patterns:
- Transaction-aware methods (`*WithTransaction`)
- Interface-based dependency injection
- Consistent error handling and validation
- Comprehensive include parameter support

### **Database Transaction Strategy**

```typescript
// All order operations use atomic transactions
async completeDelivery(orderId: number, deliveryUserId: number): Promise<OrderTransition> {
  return await this.withTransaction(async (trx) => {
    // 1. Validate order state
    // 2. Create inventory transactions
    // 3. Update reservations
    // 4. Update order status
    // 5. Create audit records
    // Either all succeed or all rollback
  });
}
```

### **Integration with Existing Systems**

**Inventory Transaction Service:**
- Extend existing service with transaction-aware methods
- Reuse all business logic and validation
- Maintain consistent transaction types and patterns

**Current Inventory System:**
- Use existing `store_assignment_current_inventory` table
- Leverage current inventory lookup mechanisms
- Maintain real-time inventory accuracy

**Audit System:**
- Extend existing audit patterns to orders
- Create order status history similar to inventory
- Maintain complete operation traceability

## API Design Standards

### **Endpoint Patterns**

```
# Resource Management
POST   /v1/orders                    # Create
GET    /v1/orders                    # List with filters
GET    /v1/orders/:id                # Get by ID
PATCH  /v1/orders/:id/status         # Update status
DELETE /v1/orders/:id                # Cancel

# Workflow Operations
POST   /v1/orders/:id/confirm        # Business operations
POST   /v1/orders/:id/reserve        # 
POST   /v1/orders/:id/start-delivery # 
POST   /v1/orders/:id/complete-delivery

# Related Resources
GET    /v1/orders/:id/reservations   # Sub-resources
GET    /v1/orders/:id/transactions   #
GET    /v1/orders/:id/deliveries     #

# Validation & Analysis
POST   /v1/orders/check-availability # Utilities
POST   /v1/orders/validate          #
```

### **Request/Response Standards**

- Consistent error handling with appropriate HTTP status codes
- Include parameter support for flexible data loading
- Pagination for list endpoints
- Filtering and sorting capabilities
- Comprehensive validation messages

## Testing Strategy - Streamlined TDD Approach

### **Testing Philosophy**

**Pragmatic TDD**: Start with foundation tests, iterate based on real needs
- **Framework**: Jest with TypeScript (following existing patterns)
- **Pattern**: Repository pattern with interface mocking
- **Database**: Mock-based testing with selective integration tests
- **Coverage**: Focus on core business logic, avoid over-engineering

### **Phase 1: Foundation Tests (Start Here)**

**Goal**: 15-20 essential tests covering core business logic

**Test Structure**:
```
src/services/orders/__tests__/
├── __mocks__/
│   ├── mockOrderRepository.ts      # Repository interface mocks
│   └── orderTestData.ts            # Test data factory
├── orderCalculations.test.ts       # Price/total calculations  
├── orderValidation.test.ts         # Business rules validation
└── orderWorkflow.test.ts           # Status transitions
```

**Core Test Areas**:
- Order total calculations with different item types
- Business rule validation (delivery address, payment methods)
- Status transition rules and constraints
- Inventory availability calculations

### **Iterative Expansion (As Needed)**

**Phase 2**: Repository tests (when implementing database layer)
**Phase 3**: Service integration tests (when connecting components)
**Phase 4**: End-to-end tests (for complete workflows)

**Key Principle**: Write tests as you need them, not preemptively

### **Test Data Strategy**

Following inventory module patterns:
- String literals for enums (avoid circular dependencies)
- Mock repositories with interface-based testing
- Test factories for creating consistent test data
- Shared utilities across test files

### **Essential Test Scenarios**

**Business Logic (Priority 1)**:
- Order creation and validation
- Payment method validation
- Delivery address requirements
- Item quantity and pricing calculations

**Workflow Logic (Priority 2)**:
- Status transition rules (pending → confirmed → reserved)
- Invalid transition prevention
- Business rule enforcement at each stage

**Integration Logic (Priority 3)**:
- Inventory availability checking
- Reservation creation and restoration
- Transaction linking for traceability

## Success Metrics

### **Phase Completion Criteria**

**Phase 1:**
- [ ] Database schema created and migrated
- [ ] Basic CRUD operations functional
- [ ] API endpoints respond correctly
- [ ] Manual order entry possible

**Phase 2:**
- [ ] Inventory reservations work atomically
- [ ] Availability checking accurate
- [ ] Reservation restoration functional
- [ ] Order status transitions properly

**Phase 3:**
- [ ] Delivery completion creates transactions
- [ ] Traceability links functional
- [ ] Integration with inventory system seamless
- [ ] Atomic delivery operations

**Phase 4:**
- [ ] Order cancellation restores inventory
- [ ] Failed delivery handling works
- [ ] Edge cases handled gracefully
- [ ] Error recovery mechanisms functional

**Phase 5:**
- [ ] Invoice generation optional and working
- [ ] Invoice data accurate
- [ ] Order completion workflow functional

### **Business Value Delivery**

**Immediate Value (Phase 1-2):**
- Replace manual phone/WhatsApp order tracking
- Provide real-time inventory availability
- Enable systematic order management

**Medium-term Value (Phase 3-4):**
- Complete delivery workflow automation
- Inventory accuracy through transaction tracking
- Robust error handling and recovery

**Long-term Value (Phase 5+):**
- Ready for n8n automation integration
- Complete business process digitization
- Scalable order management foundation

## Future Enhancement Roadmap

### **Immediate Post-MVP**
- Advanced reporting and analytics
- Customer management system
- Delivery route optimization
- SMS/WhatsApp notifications

### **Medium-term Enhancements**
- n8n workflow integration
- Customer self-service portal
- Advanced invoice features (PDF, email)
- Payment tracking integration

### **Long-term Vision**
- Mobile delivery app
- Real-time tracking
- Customer loyalty programs
- Business intelligence dashboard

## Development Guidelines

### **Code Standards**
- Follow existing inventory module patterns
- Maintain consistent error handling
- Use TypeScript interfaces for all contracts
- Comprehensive documentation and comments

### **Database Standards**
- Follow existing schema conventions
- Use proper indexing for performance
- Maintain referential integrity
- Create appropriate migrations

### **Testing Standards**
- Achieve same test coverage as inventory module
- Test all business logic thoroughly
- Include performance and load testing
- Maintain test data consistency

This implementation guide provides a structured approach to building the Orders module while maintaining consistency with the existing codebase and preparing for future business growth.