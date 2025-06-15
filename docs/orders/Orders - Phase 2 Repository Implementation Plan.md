# Orders - Phase 2: Repository Layer Implementation Plan

## 🎯 **Goal**
Create a robust repository layer that provides data access abstractions for the Orders module, following established patterns from the inventory module while supporting the UX design requirements.

## 📊 **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │   OrderService  │  │ WorkflowService │  │ReservationSvc   ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   REPOSITORY LAYER                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │  IOrderRepo     │  │ IWorkflowRepo   │  │IReservationRepo ││
│  │  PgOrderRepo    │  │ PgWorkflowRepo  │  │PgReservationRepo││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMAS                        │
│     orders + order_items + reservations + history          │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ **Repository Structure**

```
src/repositories/orders/
├── IOrderRepository.ts                    # Core order CRUD operations
├── PgOrderRepository.ts                   # PostgreSQL implementation  
├── IOrderWorkflowRepository.ts            # Order status & workflow operations
├── PgOrderWorkflowRepository.ts           # PostgreSQL workflow implementation
├── IInventoryReservationRepository.ts    # Inventory reservation operations
├── PgInventoryReservationRepository.ts   # PostgreSQL reservation implementation
├── ICustomerRepository.ts                # Customer lookup & management
├── PgCustomerRepository.ts               # PostgreSQL customer implementation
└── index.ts                              # Barrel exports
```

## 🔧 **Implementation Details**

### **Phase 2.1: Core Order Repository** 

**Files to Create:**
1. `IOrderRepository.ts` - Interface definition
2. `PgOrderRepository.ts` - PostgreSQL implementation

**Key Methods:**
```typescript
interface IOrderRepository {
  // Core CRUD
  create(order: NewOrderType): Promise<OrderWithDetails>;
  findById(orderId: number): Promise<OrderWithDetails | null>;
  findByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null>;
  update(orderId: number, updates: Partial<OrderType>): Promise<OrderWithDetails>;
  
  // Business queries
  findByStoreAndStatus(storeId: number, status: string): Promise<OrderType[]>;
  findByCustomer(customerId: number): Promise<OrderType[]>;
  findPendingOrdersByStore(storeId: number): Promise<OrderType[]>;
  
  // UX Design Support
  findRecentOrdersByPhone(phone: string, limit?: number): Promise<OrderType[]>;
  findCustomerLastOrder(customerId: number): Promise<OrderType | null>;
  
  // Transaction Support
  createWithTransaction(trx: DbTransaction, order: NewOrderType): Promise<OrderWithDetails>;
  updateStatusWithTransaction(trx: DbTransaction, orderId: number, status: string): Promise<void>;
  
  // Relations Support
  findByIdWithRelations(orderId: number, relations?: OrderRelationOptions): Promise<OrderWithDetails>;
}
```

**Relation Options:**
```typescript
interface OrderRelationOptions {
  customer?: boolean;      // Include customer info
  orderItems?: boolean;    // Include order items
  reservations?: boolean;  // Include inventory reservations
  statusHistory?: boolean; // Include status change history
  transactions?: boolean;  // Include linked inventory transactions
  deliveries?: boolean;    // Include delivery information
  invoice?: boolean;       // Include invoice if exists
}
```

### **Phase 2.2: Customer Repository**

**Files to Create:**
1. `ICustomerRepository.ts` - Interface definition
2. `PgCustomerRepository.ts` - PostgreSQL implementation

**Key Methods:**
```typescript
interface ICustomerRepository {
  // Core CRUD
  create(customer: NewCustomer): Promise<Customer>;
  findById(customerId: number): Promise<Customer | null>;
  update(customerId: number, updates: Partial<Customer>): Promise<Customer>;
  
  // UX Design Support - Critical for phone conversation flow
  findByPhone(phone: string): Promise<CustomerSearchResult | null>;
  searchByName(name: string): Promise<CustomerSearchResult[]>;
  findByPhoneOrCreate(customerData: QuickCustomerCreation): Promise<CustomerForOrder>;
  
  // Business Intelligence
  findWithOrderHistory(customerId: number): Promise<CustomerWithOrders>;
  findWithDebts(customerId: number): Promise<CustomerWithDebts>;
  getCustomerAnalytics(customerId: number): Promise<CustomerAnalytics>;
  
  // Auto-Update Methods (for order lifecycle)
  updateLastOrderDate(customerId: number, orderDate: Date): Promise<void>;
  incrementOrderCount(customerId: number): Promise<void>;
  updatePreferredPayment(customerId: number, paymentMethod: string): Promise<void>;
}
```

### **Phase 2.3: Order Workflow Repository**

**Files to Create:**
1. `IOrderWorkflowRepository.ts` - Interface definition  
2. `PgOrderWorkflowRepository.ts` - PostgreSQL implementation

**Key Methods:**
```typescript
interface IOrderWorkflowRepository {
  // Status Management
  updateOrderStatus(orderId: number, fromStatus: string, toStatus: string, changedBy: number, reason: string): Promise<void>;
  validateStatusTransition(fromStatus: string, toStatus: string): boolean;
  
  // Status History
  createStatusHistory(orderId: number, fromStatus: string, toStatus: string, changedBy: number, reason: string, notes?: string): Promise<void>;
  getStatusHistory(orderId: number): Promise<OrderStatusHistory[]>;
  
  // Transaction Support (for atomic workflow operations)
  updateOrderStatusWithTransaction(trx: DbTransaction, orderId: number, fromStatus: string, toStatus: string, changedBy: number, reason: string): Promise<void>;
  createStatusHistoryWithTransaction(trx: DbTransaction, orderId: number, fromStatus: string, toStatus: string, changedBy: number, reason: string, notes?: string): Promise<void>;
  
  // Business Intelligence
  getOrdersByStatus(status: string): Promise<OrderType[]>;
  getWorkflowMetrics(storeId?: number, dateRange?: { from: Date; to: Date }): Promise<WorkflowMetrics>;
}
```

### **Phase 2.4: Inventory Reservation Repository**

**Files to Create:**
1. `IInventoryReservationRepository.ts` - Interface definition
2. `PgInventoryReservationRepository.ts` - PostgreSQL implementation

**Key Methods:**
```typescript
interface IInventoryReservationRepository {
  // Core Reservation Operations
  createReservation(orderId: number, assignmentId: number, currentInventoryId: number, itemType: string, itemId: number, quantity: number): Promise<InventoryReservationType>;
  findByOrderId(orderId: number): Promise<InventoryReservationType[]>;
  findActiveReservations(assignmentId: number): Promise<InventoryReservationType[]>;
  
  // Reservation Status Management
  fulfillReservations(orderId: number): Promise<void>;
  cancelReservations(orderId: number): Promise<void>;
  expireOldReservations(): Promise<number>; // Returns count of expired
  
  // Availability Checking (Critical for UX)
  checkAvailability(storeId: number, items: AvailabilityCheckItem[]): Promise<AvailabilityResult>;
  getAvailableQuantity(assignmentId: number, itemType: string, itemId: number): Promise<number>;
  
  // Transaction Support
  createReservationWithTransaction(trx: DbTransaction, ...params): Promise<InventoryReservationType>;
  cancelReservationsWithTransaction(trx: DbTransaction, orderId: number): Promise<void>;
  
  // Integration with Inventory System
  reserveInventoryItems(orderId: number, storeId: number, items: OrderItemRequest[]): Promise<InventoryReservationType[]>;
  restoreReservedInventory(orderId: number): Promise<void>;
}
```

## 🔄 **Transaction Support Pattern**

Following your inventory pattern, all critical operations will support database transactions:

```typescript
// Example: Order creation with inventory reservation
async createOrderWithReservation(orderData: CreateOrderRequest): Promise<OrderWithDetails> {
  return await db.transaction(async (trx) => {
    // 1. Create order
    const order = await this.orderRepo.createWithTransaction(trx, orderData);
    
    // 2. Reserve inventory
    const reservations = await this.reservationRepo.reserveInventoryItems(trx, order.orderId, orderData.storeId, orderData.items);
    
    // 3. Create status history
    await this.workflowRepo.createStatusHistoryWithTransaction(trx, order.orderId, null, 'pending', orderData.createdBy, 'Order created');
    
    return order;
  });
}
```

## 🎯 **UX Design Integration Points**

### **Customer Phone Lookup (UX Step 2)**
```typescript
// Repository method supports UX "What's your name?" flow
async findByPhone(phone: string): Promise<CustomerSearchResult | null> {
  return await db.select({
    customerId: customers.customerId,
    firstName: customers.firstName,
    lastName: customers.lastName,
    phoneNumber: customers.phoneNumber,
    address: customers.address,
    lastOrderDate: customers.lastOrderDate,        // "Last order: 1 week ago"
    preferredPaymentMethod: customers.preferredPaymentMethod, // "Usually pays: Cash"
    totalOrders: customers.totalOrders,
  })
  .from(customers)
  .where(eq(customers.phoneNumber, formatPeruvianPhone(phone)))
  .then(results => results[0] || null);
}
```

### **Inventory Availability (UX Order Validation)**
```typescript
// Repository method supports "2x 20kg tanks available?" validation
async checkAvailability(storeId: number, items: AvailabilityCheckItem[]): Promise<AvailabilityResult> {
  // Calculate available = current - reserved for each item
  // Return detailed availability breakdown for UX display
}
```

## 📋 **Implementation Steps**

### **Step 1: Core Order Repository** (Day 1-2)
- [x] Create `IOrderRepository.ts` interface
- [ ] Implement `PgOrderRepository.ts` with Drizzle ORM
- [ ] Add relation loading support
- [ ] Add transaction support methods
- [ ] Create unit tests

### **Step 2: Customer Repository** (Day 2-3)  
- [ ] Create `ICustomerRepository.ts` interface
- [ ] Implement `PgCustomerRepository.ts` with phone lookup
- [ ] Add UX design support methods
- [ ] Add customer analytics methods
- [ ] Create unit tests

### **Step 3: Workflow Repository** (Day 3-4)
- [ ] Create `IOrderWorkflowRepository.ts` interface
- [ ] Implement `PgOrderWorkflowRepository.ts` with status management
- [ ] Add status transition validation
- [ ] Add audit trail support
- [ ] Create unit tests

### **Step 4: Reservation Repository** (Day 4-5)
- [ ] Create `IInventoryReservationRepository.ts` interface
- [ ] Implement `PgInventoryReservationRepository.ts` with availability checking
- [ ] Add integration with existing inventory system
- [ ] Add transaction-aware reservation methods
- [ ] Create unit tests

### **Step 5: Integration & Testing** (Day 5-6)
- [ ] Create repository barrel exports
- [ ] Add dependency injection setup
- [ ] Integration testing with existing inventory repositories
- [ ] Performance testing for UX requirements (<500ms customer lookup)
- [ ] Documentation updates

## 🔗 **Dependencies**

### **Internal Dependencies:**
- ✅ Database schemas (Phase 1 complete)
- ✅ DTOs and interfaces (Phase 1 complete)
- ✅ Existing inventory repositories (for integration)
- ✅ Transaction patterns (following inventory module)

### **External Dependencies:**
- ✅ Drizzle ORM setup
- ✅ Database connection
- ✅ Custom error classes
- ✅ Query builders (if needed)

## 🎯 **Success Criteria**

### **Performance Requirements:**
- Customer phone lookup: <200ms
- Order creation: <500ms
- Availability checking: <300ms
- Transaction operations: <1s

### **Functionality Requirements:**
- ✅ Complete CRUD operations for orders
- ✅ Phone-based customer lookup (UX critical)
- ✅ Inventory availability checking
- ✅ Atomic transaction support
- ✅ Status transition validation
- ✅ Audit trail creation

### **Integration Requirements:**
- ✅ Seamless integration with existing inventory system
- ✅ Support for UX design patterns
- ✅ Transaction-aware operations
- ✅ Proper error handling and validation

## 🚀 **Phase 2 Completion**

**When Phase 2 is complete:**
- All repository interfaces defined
- PostgreSQL implementations ready
- UX design patterns supported
- Transaction safety ensured
- Unit tests passing
- Ready for Service Layer (Phase 3)

This repository layer will provide the solid foundation needed for the business logic services while maintaining the performance and UX requirements established in Phase 1.