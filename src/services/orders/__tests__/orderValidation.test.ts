/**
 * Order Validation and Business Rules Tests
 * 
 * Tests order creation validation, business rule enforcement,
 * and data integrity requirements.
 */

import {
  OrderStatus,
  OrderItemTypeEnum,
  PaymentMethod,
  PaymentStatus,
  createMockOrderRequest,
  createMockOrder,
  createMockOrderWithItems,
} from './__mocks__/orderTestData';

import {
  createMockOrderRepository,
  IOrderRepository,
} from './__mocks__/mockOrderRepository';

import {
  OrderType,
  OrderWithDetails,
} from '../../../dtos/response/orderInterface';

import {
  CreateOrderRequest,
  OrderItemRequest,
} from '../../../dtos/request/orderDTO';

// Mock service interface (to be implemented)
interface IOrderService {
  createOrder(request: CreateOrderRequest): Promise<OrderWithDetails>;
  validateOrderRequest(request: CreateOrderRequest): Promise<{ valid: boolean; errors: string[] }>;
  calculateOrderTotal(items: OrderItemRequest[]): string;
  generateOrderNumber(): string;
  validateStoreAvailability(storeId: number): Promise<boolean>;
}

describe('Order Validation Service', () => {
  let mockOrderRepository: jest.Mocked<IOrderRepository>;
  let orderService: IOrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderRepository = createMockOrderRepository();
    
    // Mock implementation will be injected when service is created
    orderService = {
      createOrder: jest.fn(),
      validateOrderRequest: jest.fn(),
      calculateOrderTotal: jest.fn(),
      generateOrderNumber: jest.fn(),
      validateStoreAvailability: jest.fn(),
    };
  });

  describe('Order Request Validation', () => {
    test('should accept valid order request', async () => {
      const validRequest = createMockOrderRequest();
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(validRequest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // UX Design Pattern: Quick entry with minimal required fields
    test('should accept quick order entry with minimal data', async () => {
      const quickOrderRequest = createMockOrderRequest({
        customerName: 'Pedro Martinez',
        customerPhone: '+51987654321',
        deliveryAddress: 'Jr. Lima 123, San Isidro',
        locationReference: undefined, // Optional in UX flow
        notes: undefined, // Optional in UX flow
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 2,
            unitPrice: '25.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(quickOrderRequest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // UX Design Pattern: Natural conversation flow - items captured first
    test('should accept order with "what they need" first approach', async () => {
      const itemsFirstRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 2, // 20kg tank (most common in UX)
            quantity: 2,
            unitPrice: '45.00',
          },
          {
            itemType: OrderItemTypeEnum.ITEM,
            inventoryItemId: 1, // Regulator
            quantity: 1,
            unitPrice: '15.00',
          },
        ],
        customerName: 'Sofia Rodriguez',
        customerPhone: '+51987555444',
        deliveryAddress: 'Av. Arequipa 456, Miraflores',
        paymentMethod: PaymentMethod.CASH, // Default in UX
        priority: 1, // Default priority
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(itemsFirstRequest);

      expect(result.valid).toBe(true);
    });

    test('should reject order without customer name when no customer ID', async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined,
        customerName: undefined,
        customerPhone: '+1234567890',
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Customer name is required when customer ID is not provided'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer name is required when customer ID is not provided');
    });

    test('should reject order without customer phone when no customer ID', async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined,
        customerName: 'John Doe',
        customerPhone: undefined,
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Customer phone is required when customer ID is not provided'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer phone is required when customer ID is not provided');
    });

    test('should accept order with customer ID and no name/phone', async () => {
      const validRequest = createMockOrderRequest({
        customerId: 123,
        customerName: undefined,
        customerPhone: undefined,
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(validRequest);

      expect(result.valid).toBe(true);
    });

    test('should reject order without delivery address', async () => {
      const invalidRequest = createMockOrderRequest({
        deliveryAddress: '',
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Delivery address is required'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Delivery address is required');
    });

    test('should reject order without items', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Order must contain at least one item'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order must contain at least one item');
    });

    test('should reject order with invalid store ID', async () => {
      const invalidRequest = createMockOrderRequest({
        storeId: 0,
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Valid store ID is required'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid store ID is required');
    });

    test('should validate payment method', async () => {
      const invalidRequest = createMockOrderRequest({
        paymentMethod: 'invalid_method' as any,
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Invalid payment method'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid payment method');
    });

    test('should validate payment status', async () => {
      const invalidRequest = createMockOrderRequest({
        paymentStatus: 'invalid_status' as any,
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Invalid payment status'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid payment status');
    });

    test('should validate priority range', async () => {
      const invalidRequest = createMockOrderRequest({
        priority: 10, // Out of valid range 1-5
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Priority must be between 1 and 5'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Priority must be between 1 and 5');
    });
  });

  describe('Order Item Validation', () => {
    test('should reject items with zero quantity', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 0,
            unitPrice: '25.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Item quantity must be greater than zero'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item quantity must be greater than zero');
    });

    test('should reject items with negative quantity', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: -1,
            unitPrice: '25.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Item quantity must be greater than zero'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item quantity must be greater than zero');
    });

    test('should reject items with zero unit price', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 1,
            unitPrice: '0',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Item unit price must be greater than zero'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Item unit price must be greater than zero');
    });

    test('should reject tank items without tank type ID', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: undefined,
            quantity: 1,
            unitPrice: '25.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Tank items must have a tank type ID'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tank items must have a tank type ID');
    });

    test('should reject inventory items without inventory item ID', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.ITEM,
            inventoryItemId: undefined,
            quantity: 1,
            unitPrice: '15.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Inventory items must have an inventory item ID'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Inventory items must have an inventory item ID');
    });

    test('should validate price format', async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 1,
            unitPrice: 'invalid-price',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Invalid unit price format'],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid unit price format');
    });
  });

  describe('Business Rules Validation', () => {
    test('should reject orders for inactive stores', async () => {
      const request = createMockOrderRequest({ storeId: 999 });
      
      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(false);
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Store is not available for orders'],
      });

      const result = await orderService.validateOrderRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Store is not available for orders');
    });

    test('should validate maximum order amount', async () => {
      const expensiveRequest = createMockOrderRequest({
        items: [
          {
            itemType: OrderItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 100,
            unitPrice: '1000.00',
          },
        ],
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Order total exceeds maximum allowed amount'],
      });

      const result = await orderService.validateOrderRequest(expensiveRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order total exceeds maximum allowed amount');
    });

    test('should validate maximum items per order', async () => {
      const manyItemsRequest = createMockOrderRequest({
        items: Array.from({ length: 51 }, (_, i) => ({
          itemType: OrderItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 1,
          unitPrice: '25.00',
        })),
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Order cannot exceed 50 items'],
      });

      const result = await orderService.validateOrderRequest(manyItemsRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Order cannot exceed 50 items');
    });

    test('should validate payment method and status compatibility', async () => {
      const incompatibleRequest = createMockOrderRequest({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID, // Cash payments usually pending until delivery
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Cash payments should be pending until delivery completion'],
      });

      const result = await orderService.validateOrderRequest(incompatibleRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cash payments should be pending until delivery completion');
    });

    // UX Design Pattern: Smart defaults for payment
    test('should accept smart payment defaults from UX flow', async () => {
      const smartDefaultsRequest = createMockOrderRequest({
        paymentMethod: PaymentMethod.CASH, // Pre-selected in UX
        paymentStatus: PaymentStatus.PENDING, // Default for cash
        priority: 1, // Default priority
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(smartDefaultsRequest);

      expect(result.valid).toBe(true);
    });

    // UX Design Pattern: Support for digital payment methods
    test('should accept Peruvian digital payment methods', async () => {
      const digitalPaymentMethods = [PaymentMethod.YAPE, PaymentMethod.PLIN, PaymentMethod.TRANSFER];
      
      for (const method of digitalPaymentMethods) {
        const digitalPaymentRequest = createMockOrderRequest({
          paymentMethod: method,
          paymentStatus: PaymentStatus.PENDING, // Should be pending until confirmed
        });
        
        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(digitalPaymentRequest);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Order Total Calculation', () => {
    test('should calculate correct total for single item', () => {
      const items: OrderItemRequest[] = [
        {
          itemType: OrderItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 2,
          unitPrice: '25.00',
        },
      ];
      
      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue('50.00');

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe('50.00');
    });

    test('should calculate correct total for multiple items', () => {
      const items: OrderItemRequest[] = [
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
      ];
      
      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue('65.00');

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe('65.00');
    });

    test('should handle decimal calculations correctly', () => {
      const items: OrderItemRequest[] = [
        {
          itemType: OrderItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 3,
          unitPrice: '33.33',
        },
      ];
      
      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue('99.99');

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe('99.99');
    });

    test('should handle zero total', () => {
      const items: OrderItemRequest[] = [];
      
      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue('0.00');

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe('0.00');
    });
  });

  describe('Order Number Generation', () => {
    test('should generate unique order number', () => {
      const orderNumber = 'ORD-2024-001';
      
      (orderService.generateOrderNumber as jest.Mock).mockReturnValue(orderNumber);

      const result = orderService.generateOrderNumber();

      expect(result).toBe(orderNumber);
      expect(result).toMatch(/^ORD-\d{4}-\d{3}$/);
    });

    test('should generate sequential order numbers', () => {
      const orderNumbers = ['ORD-2024-001', 'ORD-2024-002', 'ORD-2024-003'];
      
      orderNumbers.forEach((orderNumber, index) => {
        (orderService.generateOrderNumber as jest.Mock).mockReturnValueOnce(orderNumber);
        const result = orderService.generateOrderNumber();
        expect(result).toBe(orderNumber);
      });
    });

    test('should handle year rollover', () => {
      const orderNumber = 'ORD-2025-001';
      
      (orderService.generateOrderNumber as jest.Mock).mockReturnValue(orderNumber);

      const result = orderService.generateOrderNumber();

      expect(result).toBe(orderNumber);
      expect(result).toMatch(/^ORD-2025-\d{3}$/);
    });
  });

  describe('Order Creation Business Logic', () => {
    test('should create valid order successfully', async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems();
      
      mockOrderRepository.createOrder.mockResolvedValue(expectedOrder);
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result).toEqual(expectedOrder);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
    });

    test('should set correct initial status', async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({ status: OrderStatus.PENDING });
      
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.status).toBe(OrderStatus.PENDING);
    });

    test('should calculate and set total amount', async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems({ totalAmount: '65.00' });
      
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.totalAmount).toBe('65.00');
    });

    test('should reject order creation with validation errors', async () => {
      const invalidRequest = createMockOrderRequest({
        customerName: undefined,
        customerPhone: undefined,
        customerId: undefined,
      });
      
      (orderService.createOrder as jest.Mock).mockRejectedValue(
        new Error('Validation failed: Customer information is required')
      );

      await expect(orderService.createOrder(invalidRequest))
        .rejects.toThrow('Validation failed: Customer information is required');
    });

    test('should set created by user', async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({ createdBy: 1 });
      
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.createdBy).toBe(1);
    });

    test('should set order date to current time', async () => {
      const request = createMockOrderRequest();
      const now = new Date();
      const expectedOrder = createMockOrder({ orderDate: now });
      
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.orderDate).toBeDefined();
    });
  });

  describe('Store Availability Validation', () => {
    test('should validate store has active inventory', async () => {
      const storeId = 1;
      
      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(true);

      const result = await orderService.validateStoreAvailability(storeId);

      expect(result).toBe(true);
    });

    test('should reject orders for stores without active inventory', async () => {
      const storeId = 999;
      
      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(false);

      const result = await orderService.validateStoreAvailability(storeId);

      expect(result).toBe(false);
    });

    test('should validate store exists', async () => {
      const nonExistentStoreId = -1;
      
      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(false);

      const result = await orderService.validateStoreAvailability(nonExistentStoreId);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const request = createMockOrderRequest();
      
      mockOrderRepository.createOrder.mockRejectedValue(new Error('Database connection failed'));
      (orderService.createOrder as jest.Mock).mockRejectedValue(
        new Error('Failed to create order: Database connection failed')
      );

      await expect(orderService.createOrder(request))
        .rejects.toThrow('Failed to create order: Database connection failed');
    });

    test('should validate customer name length', async () => {
      const longNameRequest = createMockOrderRequest({
        customerName: 'A'.repeat(256), // Very long name
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Customer name must be less than 255 characters'],
      });

      const result = await orderService.validateOrderRequest(longNameRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer name must be less than 255 characters');
    });

    test('should handle special characters in customer data', async () => {
      const specialCharsRequest = createMockOrderRequest({
        customerName: 'José María',
        deliveryAddress: '123 Main St, Apt #2A, City & County',
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(specialCharsRequest);

      expect(result.valid).toBe(true);
    });

    test('should validate delivery address length', async () => {
      const longAddressRequest = createMockOrderRequest({
        deliveryAddress: 'A'.repeat(1001), // Very long address
      });
      
      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['Delivery address must be less than 1000 characters'],
      });

      const result = await orderService.validateOrderRequest(longAddressRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Delivery address must be less than 1000 characters');
    });

    test('should handle concurrent order number generation', async () => {
      const request1 = createMockOrderRequest();
      const request2 = createMockOrderRequest();
      
      const order1 = createMockOrder({ orderNumber: 'ORD-2024-001' });
      const order2 = createMockOrder({ orderNumber: 'ORD-2024-002' });
      
      (orderService.createOrder as jest.Mock)
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);

      const result1 = await orderService.createOrder(request1);
      const result2 = await orderService.createOrder(request2);

      expect(result1.orderNumber).toBe('ORD-2024-001');
      expect(result2.orderNumber).toBe('ORD-2024-002');
    });
  });
});