/**
 * Order Test Data Factory
 *
 * Provides consistent test data for order-related tests.
 * Follows existing patterns from inventory transaction tests.
 */

import {
  OrderItemType,
  OrderTransition,
  OrderType,
  OrderWithDetails,
} from "../../../../dtos/response/orderInterface";

import { CreateOrderRequest } from "../../../../dtos/request/orderDTO";

// Import actual enums from schemas
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../../../db/schemas/orders/order-status-types";

import {
  DeliveryStatusEnum,
  ItemTypeEnum,
} from "../../../../db/schemas/orders/order-types";

// Test data factories (matching actual database schema structure)
export const createMockOrderRequest = (
  overrides: Partial<CreateOrderRequest> = {}
): CreateOrderRequest => ({
  // No storeId required - will be assigned later via store assignment
  customerName: "John Doe",
  customerPhone: "+1234567890",
  deliveryAddress: "123 Main St, City, State",
  locationReference: "Near the big tree",
  paymentMethod: PaymentMethodEnum.CASH,
  paymentStatus: PaymentStatusEnum.PENDING,
  priority: 1,
  notes: "Ring doorbell twice",
  items: [
    {
      itemType: ItemTypeEnum.TANK,
      tankTypeId: 1,
      quantity: 2,
      unitPrice: "25.00",
    },
    {
      itemType: ItemTypeEnum.ITEM,
      inventoryItemId: 1,
      quantity: 1,
      unitPrice: "15.00",
    },
  ],
  ...overrides,
});

// UX Design Pattern: Natural conversation flow order entry
export const createConversationOrderEntry = (
  overrides: Partial<CreateOrderRequest> = {}
): CreateOrderRequest => ({
  // No storeId - follows UX where store is assigned after order creation
  customerName: "Pedro Martinez",
  customerPhone: "+51987654321",
  deliveryAddress: "Jr. Lima 123, San Isidro",
  locationReference: "Cerca al parque central",
  paymentMethod: PaymentMethodEnum.CASH, // Pre-selected in UX
  paymentStatus: PaymentStatusEnum.PENDING, // Default for cash
  priority: 1, // Default priority
  notes: undefined, // Optional in quick entry
  items: [
    {
      itemType: ItemTypeEnum.TANK,
      tankTypeId: 2, // 20kg tank (most common)
      quantity: 2,
      unitPrice: "45.00",
    },
  ],
  ...overrides,
});

export const createMockOrder = (
  overrides: Partial<OrderType> = {}
): OrderType => ({
  orderId: 1,
  orderNumber: "ORD-2024-001",
  customerId: null,
  customerName: "John Doe",
  customerPhone: "+1234567890",
  assignedTo: null, // Store assignment - null for PENDING orders
  orderDate: new Date("2024-01-01T10:00:00Z"),
  deliveryAddress: "123 Main St, City, State",
  locationReference: "Near the big tree",
  status: OrderStatusEnum.PENDING,
  priority: 1,
  paymentMethod: PaymentMethodEnum.CASH,
  paymentStatus: PaymentStatusEnum.PENDING,
  totalAmount: "65.00",
  createdBy: 1,
  deliveryDate: null,
  notes: "Ring doorbell twice",
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});

// Factory for orders with store assignment (CONFIRMED or later status)
export const createMockOrderWithAssignment = (
  overrides: Partial<OrderType> = {}
): OrderType => ({
  ...createMockOrder({
    assignedTo: 1, // Assigned to store assignment ID 1
    status: OrderStatusEnum.CONFIRMED,
    ...overrides,
  }),
});

export const createMockOrderItem = (
  overrides: Partial<OrderItemType> = {}
): OrderItemType => ({
  itemId: 1,
  orderId: 1,
  itemType: ItemTypeEnum.TANK,
  tankTypeId: 1,
  inventoryItemId: null,
  quantity: 2,
  tankReturned: true,
  unitPrice: "25.00",
  totalPrice: "50.00",
  deliveryStatus: DeliveryStatusEnum.PENDING,
  deliveredBy: null,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});

export const createMockOrderWithItems = (
  overrides: Partial<OrderWithDetails> = {}
): OrderWithDetails => ({
  ...createMockOrder(overrides),
  orderItems: [
    createMockOrderItem({
      itemId: 1,
      itemType: ItemTypeEnum.TANK,
      tankTypeId: 1,
      inventoryItemId: null,
      quantity: 2,
      unitPrice: "25.00",
      totalPrice: "50.00",
    }),
    createMockOrderItem({
      itemId: 2,
      itemType: ItemTypeEnum.ITEM,
      tankTypeId: null,
      inventoryItemId: 1,
      quantity: 1,
      unitPrice: "15.00",
      totalPrice: "15.00",
    }),
  ],
});

export const createMockOrderTransition = (
  overrides: Partial<OrderTransition> = {}
): OrderTransition => ({
  order: createMockOrderWithItems({ status: OrderStatusEnum.CONFIRMED }),
  statusChange: {
    historyId: 1,
    orderId: 1,
    fromStatus: OrderStatusEnum.PENDING,
    toStatus: OrderStatusEnum.CONFIRMED,
    changedBy: 1,
    reason: "Order confirmed by operator",
    notes: null,
    createdAt: new Date("2024-01-01T10:30:00Z"),
  },
  transactions: [],
  reservations: [],
  ...overrides,
});

// Current inventory mock data (for availability checks)
export const createMockCurrentInventory = (overrides: any = {}) => ({
  assignmentId: 1,
  inventoryId: 1,
  storeId: 1,
  userId: 1,
  status: "assigned",
  fullTanks: 10,
  emptyTanks: 5,
  items: [
    {
      inventoryItemId: 1,
      currentQuantity: 5,
    },
  ],
  ...overrides,
});

// Test scenario builders - reflects new workflow with store assignment
export const createOrderWorkflowScenario = () => ({
  // PENDING: No store assignment yet
  initialOrder: createMockOrder({ 
    status: OrderStatusEnum.PENDING,
    assignedTo: null 
  }),
  // CONFIRMED: Store assignment made
  confirmedOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.CONFIRMED 
  }),
  // RESERVED: Delivery user confirmed inventory
  reservedOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.RESERVED 
  }),
  // IN_TRANSIT: Delivery started
  inTransitOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.IN_TRANSIT 
  }),
  // DELIVERED: Delivery completed
  deliveredOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.DELIVERED 
  }),
  // FULFILLED: Invoice generated
  fulfilledOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.FULFILLED 
  }),
  // CANCELLED: Order cancelled (can happen at any stage)
  cancelledOrder: createMockOrder({ 
    status: OrderStatusEnum.CANCELLED 
  }),
  // FAILED: Delivery failed
  failedOrder: createMockOrderWithAssignment({ 
    status: OrderStatusEnum.FAILED 
  }),
});

// UX Design Pattern: Natural conversation flow scenarios
export const createUXOrderScenarios = () => ({
  // Step 1: Items first ("I need 2 tanks of 20kg")
  itemsFirstEntry: createConversationOrderEntry(),

  // Step 2: Customer identification ("What's your name?")
  existingCustomerEntry: createConversationOrderEntry({ customerId: 123 }),
  newCustomerEntry: createMockOrderRequest({
    customerId: undefined,
    customerName: "Sofia Rodriguez",
    customerPhone: "+51987555444",
    deliveryAddress: "Av. Arequipa 456, Miraflores",
  }),

  // Step 3: Address confirmation ("Same address as usual?")
  sameAddressEntry: createConversationOrderEntry({
    locationReference: "Same as last time",
  }),

  // Step 4: Payment method ("How will you pay?")
  cashPaymentEntry: createConversationOrderEntry({
    paymentMethod: PaymentMethodEnum.CASH,
  }),
  yapePaymentEntry: createConversationOrderEntry({
    paymentMethod: PaymentMethodEnum.YAPE,
  }),
  plinPaymentEntry: createConversationOrderEntry({
    paymentMethod: PaymentMethodEnum.PLIN,
  }),
  transferPaymentEntry: createConversationOrderEntry({
    paymentMethod: PaymentMethodEnum.TRANSFER,
  }),
});

// UX Design Pattern: Common tank sizes based on UI mockups
export const createCommonTankOrderEntry = (
  tankSize: "10kg" | "20kg" | "45kg",
  overrides: Partial<CreateOrderRequest> = {}
): CreateOrderRequest => {
  const tankConfigs = {
    "10kg": { tankTypeId: 1, unitPrice: "25.00" },
    "20kg": { tankTypeId: 2, unitPrice: "45.00" },
    "45kg": { tankTypeId: 3, unitPrice: "85.00" },
  };

  const config = tankConfigs[tankSize];

  return createConversationOrderEntry({
    items: [
      {
        itemType: ItemTypeEnum.TANK,
        tankTypeId: config.tankTypeId,
        quantity: 1,
        unitPrice: config.unitPrice,
      },
    ],
    ...overrides,
  });
};

// UX Design Pattern: Peruvian phone number scenarios
export const createPeruvianPhoneScenarios = () => ({
  validMobileNumber: "+51987654321",
  validLandlineNumber: "+5114567890",
  validShortMobile: "987654321",
  invalidShortNumber: "12345",
  invalidFormat: "not-a-phone",
});

// UX Design Pattern: Peruvian address scenarios
export const createPeruvianAddressScenarios = () => ({
  limaAddress: "Jr. Lima 123, San Isidro",
  avenidaAddress: "Av. Arequipa 456, Miraflores",
  calleAddress: "Calle Los Pinos 789, Surco",
  addressWithReference: "Av. Javier Prado 1234, San Borja",
  shortAddress: "Casa 123",
});
