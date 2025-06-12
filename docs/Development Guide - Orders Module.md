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

## Testing Strategy

### **Test Coverage Requirements**

Following inventory module patterns:
- **Unit Tests**: All service methods and business logic
- **Integration Tests**: Database operations and transactions
- **Workflow Tests**: Complete order lifecycle scenarios
- **Error Handling Tests**: Edge cases and failure scenarios

### **Key Test Scenarios**

**Happy Path:**
- Complete order lifecycle (pending → fulfilled)
- Multiple item types in single order
- Concurrent order processing

**Error Scenarios:**
- Insufficient inventory handling
- Failed delivery recovery
- Order cancellation at various stages
- Database transaction rollbacks

**Edge Cases:**
- Stale inventory during reservation
- Concurrent order reservation conflicts
- Partial delivery scenarios

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