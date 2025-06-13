/**
 * Order Test Data Factory
 * 
 * Provides consistent test data for order-related tests.
 * Follows existing patterns from inventory transaction tests.
 */

import {
  OrderType,
  NewOrderType,
  OrderItemType,
  NewOrderItemType,
  InventoryReservationType,
  NewInventoryReservationType,
  OrderWithDetails,
  AvailabilityResult,
  OrderTransition,
} from '../../../../dtos/response/orderInterface';

import {
  CreateOrderRequest,
  OrderItemRequest,
  CheckAvailabilityRequest,
} from '../../../../dtos/request/orderDTO';

// Mock enums to avoid circular dependencies (following inventory patterns)
export const OrderStatus = {
  PENDING: 'pending' as const,
  CONFIRMED: 'confirmed' as const,
  RESERVED: 'reserved' as const,
  IN_TRANSIT: 'in_transit' as const,
  DELIVERED: 'delivered' as const,
  FULFILLED: 'fulfilled' as const,
  CANCELLED: 'cancelled' as const,
  FAILED: 'failed' as const,
} as const;

export const OrderItemTypeEnum = {
  TANK: 'tank' as const,
  ITEM: 'item' as const,
} as const;

export const ReservationStatus = {
  ACTIVE: 'active' as const,
  FULFILLED: 'fulfilled' as const,
  CANCELLED: 'cancelled' as const,
  EXPIRED: 'expired' as const,
} as const;

export const PaymentMethod = {
  CASH: 'cash' as const,
  YAPE: 'yape' as const,
  PLIN: 'plin' as const,
  TRANSFER: 'transfer' as const,
} as const;

export const PaymentStatus = {
  PENDING: 'pending' as const,
  PAID: 'paid' as const,
  DEBT: 'debt' as const,
} as const;

// Test data factories (matching actual database schema structure)
export const createMockOrderRequest = (overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest => ({
  storeId: 1,
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  deliveryAddress: '123 Main St, City, State',
  locationReference: 'Near the big tree',
  paymentMethod: PaymentMethod.CASH,
  paymentStatus: PaymentStatus.PENDING,
  priority: 1,
  notes: 'Ring doorbell twice',
  items: [
    {
      itemType: OrderItemTypeEnum.TANK,
      tankTypeId: 1,
      quantity: 2,
      unitPrice: '25.00',
    },
    {
      itemType: OrderItemTypeEnum.ITEM,
      inventoryItemId: 1,
      quantity: 1,
      unitPrice: '15.00',
    },
  ],
  ...overrides,
});

// UX Design Pattern: Quick order entry for phone conversations
export const createQuickOrderEntry = (overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest => ({
  storeId: 1,
  customerName: 'Pedro Martinez',
  customerPhone: '+51987654321',
  deliveryAddress: 'Jr. Lima 123, San Isidro',
  locationReference: 'Cerca al parque central',
  paymentMethod: PaymentMethod.CASH, // Pre-selected in UX
  paymentStatus: PaymentStatus.PENDING, // Default for cash
  priority: 1, // Default priority
  notes: undefined, // Optional in quick entry
  items: [
    {
      itemType: OrderItemTypeEnum.TANK,
      tankTypeId: 2, // 20kg tank (most common)
      quantity: 2,
      unitPrice: '45.00',
    },
  ],
  ...overrides,
});

export const createMockOrder = (overrides: Partial<OrderType> = {}): OrderType => ({
  orderId: 1,
  orderNumber: 'ORD-2024-001',
  customerId: null,
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  storeId: 1,
  orderDate: new Date('2024-01-01T10:00:00Z'),
  deliveryAddress: '123 Main St, City, State',
  locationReference: 'Near the big tree',
  status: OrderStatus.PENDING,
  priority: 1,
  paymentMethod: PaymentMethod.CASH,
  paymentStatus: PaymentStatus.PENDING,
  totalAmount: '65.00',
  createdBy: 1,
  deliveredBy: null,
  deliveryDate: null,
  notes: 'Ring doorbell twice',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
});

export const createMockOrderItem = (overrides: Partial<OrderItemType> = {}): OrderItemType => ({
  itemId: 1,
  orderId: 1,
  itemType: OrderItemTypeEnum.TANK,
  tankTypeId: 1,
  inventoryItemId: null,
  quantity: 2,
  tankReturned: true,
  unitPrice: '25.00',
  totalPrice: '50.00',
  deliveryStatus: 'pending',
  deliveredBy: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
});

export const createMockOrderWithItems = (overrides: Partial<OrderWithDetails> = {}): OrderWithDetails => ({
  ...createMockOrder(overrides),
  orderItems: [
    createMockOrderItem({ 
      itemId: 1, 
      itemType: OrderItemTypeEnum.TANK, 
      tankTypeId: 1, 
      inventoryItemId: null,
      quantity: 2, 
      unitPrice: '25.00', 
      totalPrice: '50.00' 
    }),
    createMockOrderItem({ 
      itemId: 2, 
      itemType: OrderItemTypeEnum.ITEM, 
      tankTypeId: null,
      inventoryItemId: 1, 
      quantity: 1, 
      unitPrice: '15.00', 
      totalPrice: '15.00' 
    }),
  ],
});

export const createMockReservation = (overrides: Partial<InventoryReservationType> = {}): InventoryReservationType => ({
  reservationId: 1,
  orderId: 1,
  assignmentId: 1,
  currentInventoryId: 1,
  itemType: OrderItemTypeEnum.TANK,
  tankTypeId: 1,
  inventoryItemId: null,
  reservedQuantity: 2,
  status: ReservationStatus.ACTIVE,
  expiresAt: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
});

export const createMockAvailabilityRequest = (overrides: Partial<CheckAvailabilityRequest> = {}): CheckAvailabilityRequest => ({
  storeId: 1,
  items: [
    {
      itemType: OrderItemTypeEnum.TANK,
      tankTypeId: 1,
      quantity: 2,
    },
    {
      itemType: OrderItemTypeEnum.ITEM,
      inventoryItemId: 1,
      quantity: 1,
    },
  ],
  ...overrides,
});

export const createMockAvailabilityResult = (overrides: Partial<AvailabilityResult> = {}): AvailabilityResult => ({
  available: true,
  details: [
    {
      itemType: OrderItemTypeEnum.TANK,
      tankTypeId: 1,
      requested: 2,
      current: 10,
      reserved: 3,
      available: 7,
    },
    {
      itemType: OrderItemTypeEnum.ITEM,
      inventoryItemId: 1,
      requested: 1,
      current: 5,
      reserved: 1,
      available: 4,
    },
  ],
  ...overrides,
});

export const createMockOrderTransition = (overrides: Partial<OrderTransition> = {}): OrderTransition => ({
  order: createMockOrderWithItems({ status: OrderStatus.CONFIRMED }),
  statusChange: {
    historyId: 1,
    orderId: 1,
    fromStatus: OrderStatus.PENDING,
    toStatus: OrderStatus.CONFIRMED,
    changedBy: 1,
    reason: 'Order confirmed by operator',
    notes: null,
    createdAt: new Date('2024-01-01T10:30:00Z'),
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
  status: 'assigned',
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

// Test scenario builders
export const createOrderWorkflowScenario = () => ({
  initialOrder: createMockOrder({ status: OrderStatus.PENDING }),
  confirmedOrder: createMockOrder({ status: OrderStatus.CONFIRMED }),
  reservedOrder: createMockOrder({ status: OrderStatus.RESERVED }),
  inTransitOrder: createMockOrder({ status: OrderStatus.IN_TRANSIT }),
  deliveredOrder: createMockOrder({ status: OrderStatus.DELIVERED }),
  fulfilledOrder: createMockOrder({ status: OrderStatus.FULFILLED }),
  cancelledOrder: createMockOrder({ status: OrderStatus.CANCELLED }),
  failedOrder: createMockOrder({ status: OrderStatus.FAILED }),
});

// UX Design Pattern: Natural conversation flow scenarios
export const createUXOrderScenarios = () => ({
  // Step 1: Items first ("I need 2 tanks of 20kg")
  itemsFirstEntry: createQuickOrderEntry(),
  
  // Step 2: Customer identification ("What's your name?")
  existingCustomerEntry: createQuickOrderEntry({ customerId: 123 }),
  newCustomerEntry: createMockOrderRequest({ 
    customerId: undefined,
    customerName: 'Sofia Rodriguez',
    customerPhone: '+51987555444',
    deliveryAddress: 'Av. Arequipa 456, Miraflores',
  }),
  
  // Step 3: Address confirmation ("Same address as usual?")
  sameAddressEntry: createQuickOrderEntry({ locationReference: 'Same as last time' }),
  
  // Step 4: Payment method ("How will you pay?")
  cashPaymentEntry: createQuickOrderEntry({ paymentMethod: PaymentMethod.CASH }),
  yapePaymentEntry: createQuickOrderEntry({ paymentMethod: PaymentMethod.YAPE }),
  plinPaymentEntry: createQuickOrderEntry({ paymentMethod: PaymentMethod.PLIN }),
  transferPaymentEntry: createQuickOrderEntry({ paymentMethod: PaymentMethod.TRANSFER }),
});

export const createReservationScenario = () => ({
  availabilityRequest: createMockAvailabilityRequest(),
  sufficientInventory: createMockAvailabilityResult({ available: true }),
  insufficientInventory: createMockAvailabilityResult({ 
    available: false,
    details: [
      {
        itemType: OrderItemTypeEnum.TANK,
        tankTypeId: 1,
        requested: 2,
        current: 1,
        reserved: 0,
        available: 1,
      },
    ],
  }),
  activeReservations: [
    createMockReservation({ status: ReservationStatus.ACTIVE }),
  ],
  fulfilledReservations: [
    createMockReservation({ status: ReservationStatus.FULFILLED }),
  ],
});

// UX Design Pattern: Common tank sizes based on UI mockups
export const createCommonTankOrderEntry = (tankSize: '10kg' | '20kg' | '45kg', overrides: Partial<CreateOrderRequest> = {}): CreateOrderRequest => {
  const tankConfigs = {
    '10kg': { tankTypeId: 1, unitPrice: '25.00' },
    '20kg': { tankTypeId: 2, unitPrice: '45.00' },
    '45kg': { tankTypeId: 3, unitPrice: '85.00' },
  };

  const config = tankConfigs[tankSize];
  
  return createQuickOrderEntry({
    items: [
      {
        itemType: OrderItemTypeEnum.TANK,
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
  validMobileNumber: '+51987654321',
  validLandlineNumber: '+5114567890',
  validShortMobile: '987654321',
  invalidShortNumber: '12345',
  invalidFormat: 'not-a-phone',
});

// UX Design Pattern: Peruvian address scenarios
export const createPeruvianAddressScenarios = () => ({
  limaAddress: 'Jr. Lima 123, San Isidro',
  avenidaAddress: 'Av. Arequipa 456, Miraflores', 
  calleAddress: 'Calle Los Pinos 789, Surco',
  addressWithReference: 'Av. Javier Prado 1234, San Borja',
  shortAddress: 'Casa 123',
});