# LPG Order Management - Workflow State Machine

## Order Status Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING : Order created by operator
    
    PENDING --> CONFIRMED : confirm_order()
    PENDING --> CANCELLED : cancel_order()
    
    CONFIRMED --> RESERVED : reserve_inventory()
    CONFIRMED --> CANCELLED : cancel_order()
    
    RESERVED --> IN_TRANSIT : start_delivery()
    RESERVED --> CANCELLED : cancel_order()
    
    IN_TRANSIT --> DELIVERED : complete_delivery()
    IN_TRANSIT --> FAILED : delivery_failed()
    IN_TRANSIT --> CANCELLED : cancel_order()
    
    DELIVERED --> FULFILLED : generate_invoice()
    DELIVERED --> FAILED : delivery_issues()
    
    FAILED --> RESERVED : restore_reservations()
    FAILED --> IN_TRANSIT : retry_delivery()
    FAILED --> CANCELLED : cancel_order()
    
    FULFILLED --> [*] : Order complete
    CANCELLED --> [*] : Order terminated
    
    note right of PENDING
        Initial state when operator
        creates order from customer
        phone/WhatsApp request
    end note
    
    note right of CONFIRMED
        Order details verified,
        ready for inventory
        reservation
    end note
    
    note right of RESERVED
        Inventory successfully
        reserved but not yet
        physically moved
    end note
    
    note right of IN_TRANSIT
        Delivery user has
        started delivery
        process
    end note
    
    note right of DELIVERED
        Physical delivery
        completed, inventory
        transactions created
    end note
    
    note right of FULFILLED
        Invoice generated
        (optional), order
        complete
    end note
    
    note right of FAILED
        Delivery failed,
        inventory reservations
        restored
    end note
    
    note right of CANCELLED
        Order cancelled,
        all reservations
        restored
    end note
```

## Detailed State Transition Rules

### State Descriptions

| Status | Description | Business Rules |
|--------|-------------|----------------|
| **PENDING** | Order created by operator | - Initial state<br>- Can be edited<br>- No inventory impact |
| **CONFIRMED** | Order details verified | - Customer info validated<br>- Items confirmed available<br>- Ready for reservation |
| **RESERVED** | Inventory reserved | - Inventory quantities reserved<br>- Available = Current - Reserved<br>- Physical inventory unchanged |
| **IN_TRANSIT** | Delivery started | - Delivery user assigned<br>- Reservations remain active<br>- Delivery tracking active |
| **DELIVERED** | Physical delivery done | - Inventory transactions created<br>- Reservations converted to transactions<br>- Customer confirmation |
| **FULFILLED** | Order complete | - Invoice generated (optional)<br>- All processes complete<br>- Final state |
| **FAILED** | Delivery failed | - Inventory reservations restored<br>- Available for retry<br>- Requires attention |
| **CANCELLED** | Order terminated | - All reservations restored<br>- No inventory impact<br>- Audit trail maintained |

### Valid Transitions

```mermaid
graph TD
    A[PENDING] --> B[CONFIRMED]
    A --> H[CANCELLED]
    
    B --> C[RESERVED] 
    B --> H[CANCELLED]
    
    C --> D[IN_TRANSIT]
    C --> H[CANCELLED]
    
    D --> E[DELIVERED]
    D --> G[FAILED]
    D --> H[CANCELLED]
    
    E --> F[FULFILLED]
    E --> G[FAILED]
    
    G --> C[RESERVED]
    G --> D[IN_TRANSIT]
    G --> H[CANCELLED]
    
    F --> I[END]
    H --> I[END]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#e0f2f1
    style F fill:#c8e6c9
    style G fill:#ffebee
    style H fill:#fafafa
```

## Business Logic Integration

### Inventory Reservation System

```mermaid
sequenceDiagram
    participant O as Order Service
    participant R as Reservation Service
    participant I as Inventory Service
    participant DB as Database
    
    O->>+R: reserveInventoryForOrder(orderId)
    R->>+I: getCurrentInventory(storeId)
    I-->>-R: current quantities
    R->>+I: getActiveReservations(storeId)
    I-->>-R: reserved quantities
    R->>R: calculate available = current - reserved
    
    alt Sufficient inventory
        R->>+DB: BEGIN TRANSACTION
        R->>DB: CREATE reservations
        R->>DB: UPDATE order status → RESERVED
        R->>+DB: COMMIT
        R-->>-O: SUCCESS with reservations
    else Insufficient inventory
        R-->>O: FAILURE - insufficient inventory
    end
```

### Delivery Completion Flow

```mermaid
sequenceDiagram
    participant D as Delivery Service
    participant O as Order Service
    participant R as Reservation Service
    participant T as Transaction Service
    participant DB as Database
    
    D->>+O: completeDelivery(orderId, userId)
    O->>+DB: BEGIN TRANSACTION
    
    O->>+R: getActiveReservations(orderId)
    R-->>-O: reservations list
    
    loop For each reservation
        O->>+T: createTransactionFromReservation(reservation)
        T-->>-O: transaction created
    end
    
    O->>DB: CREATE order_transaction_links
    O->>+R: markReservationsAsFulfilled(orderId)
    R->>DB: UPDATE reservations status → fulfilled
    
    O->>DB: UPDATE order status → DELIVERED
    O->>DB: CREATE order_status_history
    
    O->>+DB: COMMIT
    O-->>-D: SUCCESS with transactions
```

## Error Handling Patterns

### Cancellation Recovery

```mermaid
flowchart TD
    A[Cancel Order Request] --> B{Order Status?}
    
    B -->|PENDING/CONFIRMED| C[Simple Cancellation]
    B -->|RESERVED| D[Restore Reservations]
    B -->|IN_TRANSIT| E[Emergency Cancellation]
    B -->|DELIVERED/FULFILLED| F[Cannot Cancel]
    
    C --> G[Update Status → CANCELLED]
    
    D --> H[Restore Reserved Inventory]
    H --> G
    
    E --> I[Create Compensating Transactions]
    I --> H
    
    F --> J[Return Error]
    
    G --> K[Create Audit Trail]
    K --> L[Success Response]
```

### Failed Delivery Recovery

```mermaid
flowchart TD
    A[Delivery Failed] --> B[Update Status → FAILED]
    B --> C[Keep Reservations Active]
    C --> D{Recovery Action?}
    
    D -->|Retry| E[Schedule New Delivery]
    D -->|Cancel| F[Restore Reservations]
    D -->|Manual Fix| G[Operator Intervention]
    
    E --> H[Status → IN_TRANSIT]
    F --> I[Status → CANCELLED]
    G --> J[Status → RESERVED]
    
    H --> K[New Delivery Attempt]
    I --> L[Order Terminated]
    J --> M[Manual Resolution]
```

## API Operation Mapping

| HTTP Method | Endpoint | State Transition | Business Operation |
|-------------|----------|------------------|-------------------|
| POST | `/v1/orders` | → PENDING | Create order |
| POST | `/v1/orders/:id/confirm` | PENDING → CONFIRMED | Validate order |
| POST | `/v1/orders/:id/reserve` | CONFIRMED → RESERVED | Reserve inventory |
| POST | `/v1/orders/:id/start-delivery` | RESERVED → IN_TRANSIT | Begin delivery |
| POST | `/v1/orders/:id/complete-delivery` | IN_TRANSIT → DELIVERED | Complete delivery |
| POST | `/v1/orders/:id/generate-invoice` | DELIVERED → FULFILLED | Generate invoice |
| POST | `/v1/orders/:id/fail-delivery` | IN_TRANSIT → FAILED | Handle failure |
| DELETE | `/v1/orders/:id` | Any → CANCELLED | Cancel order |

This workflow ensures complete order lifecycle management with proper inventory integration and comprehensive error handling.