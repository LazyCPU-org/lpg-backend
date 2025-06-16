# Orders Module - Phase 4: API Routes Implementation

## Overview

Phase 4 completed the implementation of a comprehensive, modular API routes layer for the orders module. This phase provides 15+ HTTP endpoints across 3 functional categories, enabling complete order lifecycle management from creation to fulfillment.

## Architecture

### Modular Route Structure

The API routes are organized into three distinct modules for better maintainability and separation of concerns:

```
src/routes/orders/
├── index.ts                    # Main orchestrator
├── orderCrudRoutes.ts          # Core CRUD operations
├── orderWorkflowRoutes.ts      # Workflow transitions
└── orderUtilityRoutes.ts       # Utilities and analytics
```

### Route Categories

#### 1. Core CRUD Operations (`orderCrudRoutes.ts`)
- **POST** `/orders` - Create new order
- **GET** `/orders` - List orders with filtering and pagination
- **GET** `/orders/:orderId` - Get order by ID with optional relations
- **PUT** `/orders/:orderId` - Update order details
- **DELETE** `/orders/:orderId` - Cancel order and restore inventory

#### 2. Workflow Transitions (`orderWorkflowRoutes.ts`)
- **POST** `/orders/:orderId/confirm` - Confirm order details
- **POST** `/orders/:orderId/reserve` - Reserve inventory for order
- **POST** `/orders/:orderId/start-delivery` - Start delivery process
- **POST** `/orders/:orderId/complete` - Complete delivery
- **POST** `/orders/:orderId/fail` - Mark delivery as failed
- **POST** `/orders/:orderId/cancel` - Cancel order with reason

#### 3. Utility & Analytics (`orderUtilityRoutes.ts`)
- **GET** `/orders/search` - Search orders by query
- **POST** `/orders/quick-order` - Create quick order from phone
- **POST** `/orders/check-availability` - Check item availability
- **GET** `/orders/metrics` - Get order analytics
- **POST** `/orders/bulk-transition` - Bulk status transitions
- **GET** `/orders/:orderId/history` - Get workflow history

## Implementation Details

### Dependency Injection Pattern

```typescript
export interface OrderRoutesDependencies {
  orderService: IOrderService;
  orderWorkflowService: IOrderWorkflowService;
  inventoryReservationService: IInventoryReservationService;
}

export function buildOrderRoutes(dependencies: OrderRoutesDependencies) {
  const router = Router();
  router.use('/', buildOrderCrudRoutes(dependencies));
  router.use('/', buildOrderWorkflowRoutes(dependencies));
  router.use('/', buildOrderUtilityRoutes(dependencies));
  return router;
}
```

### Middleware Integration

Each route includes proper middleware stacks:

- **Authentication**: `isAuthenticated` middleware
- **Authorization**: `requirePermission(ModuleEnum.ORDERS, ActionEnum.*)` 
- **Validation**: Zod schema validation for request bodies
- **Relations**: `parseIncludeRelations` for dynamic data inclusion
- **Error Handling**: `asyncHandler` for proper error propagation

### OpenAPI Documentation

All endpoints include comprehensive OpenAPI/Swagger documentation with:
- Parameter definitions
- Request/response schemas
- Authentication requirements
- Error response codes
- Usage examples

## API Endpoints Reference

### Core CRUD Operations

#### Create Order
```http
POST /orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "storeId": 1,
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "deliveryAddress": "123 Main St",
  "paymentMethod": "cash",
  "paymentStatus": "pending",
  "items": [
    {
      "itemType": "tank",
      "tankTypeId": 1,
      "quantity": 2,
      "unitPrice": "25.99"
    }
  ]
}
```

#### List Orders
```http
GET /orders?storeId=1&status=pending&page=1&limit=10&include=items,customer
Authorization: Bearer {token}
```

#### Get Order by ID
```http
GET /orders/123?include=items,customer,statusHistory
Authorization: Bearer {token}
```

### Workflow Operations

#### Confirm Order
```http
POST /orders/123/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Order confirmed by operator"
}
```

#### Reserve Inventory
```http
POST /orders/123/reserve
Authorization: Bearer {token}
```

#### Start Delivery
```http
POST /orders/123/start-delivery
Authorization: Bearer {token}
Content-Type: application/json

{
  "deliveryUserId": 456,
  "specialInstructions": "Fragile items"
}
```

#### Complete Delivery
```http
POST /orders/123/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "deliveryUserId": 456,
  "customerSignature": "base64signature",
  "deliveryNotes": "Delivered successfully",
  "actualItems": [
    {
      "itemType": "tank",
      "itemId": 1,
      "deliveredQuantity": 2
    }
  ]
}
```

### Utility Operations

#### Search Orders
```http
GET /orders/search?query=john&storeId=1&status=pending
Authorization: Bearer {token}
```

#### Quick Order Creation
```http
POST /orders/quick-order
Authorization: Bearer {token}
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "customerName": "Jane Smith",
  "storeId": 1,
  "items": [
    {
      "itemType": "tank",
      "itemId": 1,
      "quantity": 1
    }
  ]
}
```

#### Check Availability
```http
POST /orders/check-availability
Authorization: Bearer {token}
Content-Type: application/json

{
  "storeId": 1,
  "items": [
    {
      "itemType": "tank",
      "itemId": 1,
      "quantity": 5
    }
  ]
}
```

## Security & Permissions

### Role-Based Access Control

Routes implement granular permission checks:

- **ORDERS + CREATE**: Create new orders, quick orders
- **ORDERS + READ**: View orders, search, check availability  
- **ORDERS + UPDATE**: Update order details, workflow transitions
- **ORDERS + DELETE**: Cancel orders
- **ORDERS + ADMIN**: Bulk operations, metrics access

### Permission Matrix

| Role | Create | Read | Update | Delete | Admin |
|------|--------|------|--------|--------|-------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operator | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delivery | ❌ | ✅ | ✅ | ❌ | ❌ |

## Error Handling

### Standard Error Responses

```typescript
// 400 Bad Request
{
  "success": false,
  "error": "Validation failed",
  "details": ["Field 'customerName' is required"]
}

// 404 Not Found  
{
  "success": false,
  "error": "Order not found",
  "orderId": 123
}

// 409 Conflict
{
  "success": false,
  "error": "Cannot transition from 'delivered' to 'pending'",
  "currentStatus": "delivered",
  "requestedStatus": "pending"
}
```

### Validation Schemas

All request bodies are validated using Zod schemas:

```typescript
export const CreateOrderRequestSchema = z.object({
  storeId: z.number().positive(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  deliveryAddress: z.string().min(1),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
  items: z.array(OrderItemRequestSchema).min(1)
});
```

## Performance Features

### Pagination Support

```http
GET /orders?page=2&limit=20&offset=20
```

### Dynamic Relation Loading

```http
GET /orders?include=items,customer,statusHistory,reservations
```

### Filtering & Search

```http
GET /orders?storeId=1&status=pending,confirmed&dateFrom=2024-01-01&dateTo=2024-12-31
```

## Integration with Services

### Service Layer Coupling

Routes are loosely coupled to services through interfaces:

```typescript
// Route implementation
const result = await orderService.createOrder(orderRequest);

// Service interface
interface IOrderService {
  createOrder(request: CreateOrderRequest): Promise<OrderWithDetails>;
}
```

### Transaction Management

Complex operations use database transactions:

```typescript
// Order creation with customer creation
const result = await db.transaction(async (trx) => {
  const customer = await customerRepository.create(customerData, trx);
  const order = await orderRepository.create(orderData, trx);
  return order;
});
```

## Testing Strategy

### Route Testing Approach

```typescript
describe('Order CRUD Routes', () => {
  let mockOrderService: jest.Mocked<IOrderService>;
  let app: Express;

  beforeEach(() => {
    mockOrderService = createMockOrderService();
    const dependencies: OrderRoutesDependencies = {
      orderService: mockOrderService,
      orderWorkflowService: mockOrderWorkflowService,
      inventoryReservationService: mockInventoryReservationService
    };
    
    app = express();
    app.use('/orders', buildOrderRoutes(dependencies));
  });

  test('POST /orders creates order successfully', async () => {
    const orderData = createValidOrderData();
    mockOrderService.createOrder.mockResolvedValue(mockOrder);

    const response = await request(app)
      .post('/orders')
      .send(orderData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(mockOrderService.createOrder).toHaveBeenCalledWith(orderData);
  });
});
```

## Build Configuration

### TypeScript Compilation

Production builds generate CommonJS for reliable Docker deployment:

```json
{
  "scripts": {
    "dev": "tsx --watch server.ts",                    // ESModules development
    "build": "tsc --module CommonJS --outDir dist && echo '{\"type\":\"commonjs\"}' > dist/package.json",
    "start": "node dist/server.js"                     // CommonJS production
  }
}
```

### Docker Integration

```dockerfile
# Build stage - uses development package.json
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - auto-generated CommonJS
COPY --from=builder /app/dist ./dist
```

## Status: Phase 4 Complete ✅

### Completed Features

- ✅ **Modular route architecture** - Clean separation of concerns
- ✅ **15+ API endpoints** - Complete order lifecycle coverage
- ✅ **Middleware integration** - Auth, validation, error handling
- ✅ **OpenAPI documentation** - Comprehensive API specs
- ✅ **Permission system** - Role-based access control
- ✅ **Service interface alignment** - All compilation errors resolved
- ✅ **Build configuration** - Production-ready Docker builds
- ✅ **Error handling** - Standardized error responses
- ✅ **Input validation** - Zod schema validation

### Architecture Benefits

1. **Maintainability**: Modular structure enables focused development
2. **Scalability**: Interface-based design supports future enhancements  
3. **Security**: Granular permissions and input validation
4. **Developer Experience**: Full TypeScript support and documentation
5. **Production Ready**: Reliable build process and Docker support

### Next Phase: API Integration Testing

The routes layer is complete and ready for comprehensive integration testing to validate end-to-end functionality across the entire order management workflow.