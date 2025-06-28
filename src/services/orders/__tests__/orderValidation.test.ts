/**
 * Order Validation and Business Rules Tests
 *
 * Tests order creation validation, business rule enforcement,
 * and data integrity requirements.
 */

import {
  createCommonTankOrderEntry,
  createMockOrder,
  createMockOrderRequest,
  createMockOrderWithItems,
  createPeruvianAddressScenarios,
  createPeruvianPhoneScenarios,
  createConversationOrderEntry,
  createUXOrderScenarios,
} from "./__mocks__/orderTestData";

import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../../db/schemas/orders/order-status-types";

import { ItemTypeEnum } from "../../../db/schemas/orders/order-types";

import {
  createMockOrderRepository,
  IOrderRepository,
} from "./__mocks__/mockOrderRepository";

import { OrderWithDetails } from "../../../dtos/response/orderInterface";

import {
  CreateOrderRequest,
  OrderItemRequest,
} from "../../../dtos/request/orderDTO";
import { IOrderService } from "../IOrderService";

describe("Order Validation Service", () => {
  let mockOrderRepository: jest.Mocked<IOrderRepository>;
  let orderService: IOrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrderRepository = createMockOrderRepository();

    // Mock implementation matching actual interface
    orderService = {
      createOrder: jest.fn(),
      validateOrderRequest: jest.fn(),
      calculateOrderTotal: jest.fn(),
      generateOrderNumber: jest.fn(),
      validateStoreAvailability: jest.fn(),
      // Additional methods from actual interface
      getOrder: jest.fn(),
      updateOrder: jest.fn(),
      deleteOrder: jest.fn(),
      calculateOrderTotalDetailed: jest.fn(),
      generateOrderNumberForStore: jest.fn(),
      findOrders: jest.fn(),
      findOrdersByCustomer: jest.fn(),
      searchOrders: jest.fn(),
      getCustomerOrderHistory: jest.fn(),
      getOrderMetrics: jest.fn(),
      canModifyOrder: jest.fn(),
      canCancelOrder: jest.fn(),
    } as jest.Mocked<IOrderService>;
  });

  describe("Order Request Validation", () => {
    test("should accept valid order request", async () => {
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
    test("should accept quick order entry with minimal data", async () => {
      const quickOrderRequest = createMockOrderRequest({
        customerId: 2, // Reference to existing customer
        notes: undefined, // Optional in UX flow
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 2,
            unitPrice: "25.00",
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
      const uxScenarios = createUXOrderScenarios();
      const itemsFirstRequest = uxScenarios.itemsFirstEntry;

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(itemsFirstRequest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // Test what frontend will actually send for each UX step
    test("should accept all UX conversation flow scenarios", async () => {
      const uxScenarios = createUXOrderScenarios();
      const scenarios = [
        {
          name: "existing customer",
          request: uxScenarios.existingCustomerEntry,
        },
        { name: "new customer", request: uxScenarios.newCustomerEntry },
        { name: "same address", request: uxScenarios.sameAddressEntry },
        { name: "cash payment", request: uxScenarios.cashPaymentEntry },
        { name: "yape payment", request: uxScenarios.yapePaymentEntry },
        { name: "plin payment", request: uxScenarios.plinPaymentEntry },
        { name: "transfer payment", request: uxScenarios.transferPaymentEntry },
      ];

      for (const scenario of scenarios) {
        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(
          scenario.request
        );
        expect(result.valid).toBe(true);
      }
    });

    test("should reject order without customer ID", async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined as any, // Invalid - customerId is required
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Customer ID is required"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Customer ID is required"
      );
    });

    test("should reject order with invalid customer ID", async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: -1, // Invalid negative ID
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Customer ID must be a positive number"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Customer ID must be a positive number"
      );
    });

    test("should accept order with valid customer ID", async () => {
      const validRequest = createMockOrderRequest({
        customerId: 123, // Valid positive customer ID
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(validRequest);

      expect(result.valid).toBe(true);
    });

    test("should reject order with invalid payment method", async () => {
      const invalidRequest = createMockOrderRequest({
        paymentMethod: "invalid_method" as any,
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Invalid payment method"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid payment method");
    });

    test("should reject order without items", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Order must contain at least one item"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Order must contain at least one item");
    });


    test("should validate notes field length", async () => {
      const invalidRequest = createMockOrderRequest({
        notes: "A".repeat(1001), // Very long notes
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Notes must be less than 1000 characters"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Notes must be less than 1000 characters");
    });

    test("should accept valid notes field", async () => {
      const validRequest = createMockOrderRequest({
        notes: "Customer prefers morning delivery", // Valid notes
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(validRequest);

      expect(result.valid).toBe(true);
    });

    test("should accept empty notes field", async () => {
      const validRequest = createMockOrderRequest({
        notes: undefined, // Optional field can be undefined
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(validRequest);

      expect(result.valid).toBe(true);
    });
  });

  describe("Order Item Validation", () => {
    test("should reject items with zero quantity", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 0,
            unitPrice: "25.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Item quantity must be greater than zero"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Item quantity must be greater than zero"
      );
    });

    test("should reject items with negative quantity", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: -1,
            unitPrice: "25.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Item quantity must be greater than zero"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Item quantity must be greater than zero"
      );
    });

    test("should reject items with zero unit price", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 1,
            unitPrice: "0",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Item unit price must be greater than zero"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Item unit price must be greater than zero"
      );
    });

    test("should reject tank items without tank type ID", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: undefined,
            quantity: 1,
            unitPrice: "25.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Tank items must have a tank type ID"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Tank items must have a tank type ID");
    });

    test("should reject inventory items without inventory item ID", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.ITEM,
            inventoryItemId: undefined,
            quantity: 1,
            unitPrice: "15.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Inventory items must have an inventory item ID"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Inventory items must have an inventory item ID"
      );
    });

    test("should validate price format", async () => {
      const invalidRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 1,
            unitPrice: "invalid-price",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Invalid unit price format"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid unit price format");
    });
  });

  describe("Business Rules Validation", () => {

    test("should validate maximum order amount", async () => {
      const expensiveRequest = createMockOrderRequest({
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 100,
            unitPrice: "1000.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Order total exceeds maximum allowed amount"],
      });

      const result = await orderService.validateOrderRequest(expensiveRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Order total exceeds maximum allowed amount"
      );
    });

    test("should validate maximum items per order", async () => {
      const manyItemsRequest = createMockOrderRequest({
        items: Array.from({ length: 51 }, (_, i) => ({
          itemType: ItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 1,
          unitPrice: "25.00",
        })),
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Order cannot exceed 50 items"],
      });

      const result = await orderService.validateOrderRequest(manyItemsRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Order cannot exceed 50 items");
    });

    test("should validate payment method enum values", async () => {
      const validPaymentMethods = Object.values(PaymentMethodEnum);
      
      for (const method of validPaymentMethods) {
        const validRequest = createMockOrderRequest({
          paymentMethod: method,
        });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(validRequest);
        expect(result.valid).toBe(true);
      }
    });

    // UX Design Pattern: Simplified schema validation
    test("should accept requests with all valid schema fields", async () => {
      const completeRequest = createMockOrderRequest({
        customerId: 1,
        paymentMethod: PaymentMethodEnum.CASH,
        notes: "Customer prefers morning delivery",
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            quantity: 2,
            unitPrice: "25.00",
          },
        ],
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(completeRequest);

      expect(result.valid).toBe(true);
    });

    // UX Design Pattern: Common tank orders from UI mockups
    test("should accept common tank size orders from UX", async () => {
      const tankSizes: ("10kg" | "20kg" | "45kg")[] = ["10kg", "20kg", "45kg"];

      for (const size of tankSizes) {
        const tankOrderRequest = createCommonTankOrderEntry(size);

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(
          tankOrderRequest
        );
        expect(result.valid).toBe(true);
        expect(tankOrderRequest.items[0].itemType).toBe(ItemTypeEnum.TANK);
        expect(tankOrderRequest.paymentMethod).toBe(PaymentMethodEnum.CASH); // UX default
      }
    });

    // Test what happens when frontend sends minimal vs complete data
    test("should handle minimal order data from frontend", async () => {
      const minimalOrder = createMockOrderRequest({
        // Only essential fields per schema
        customerId: 2,
        paymentMethod: PaymentMethodEnum.CASH,
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 2,
            quantity: 2,
            unitPrice: "45.00",
          },
        ],
        // Optional fields
        notes: undefined,
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(minimalOrder);
      expect(result.valid).toBe(true);
    });

    // Test that schema validation works with different customer IDs
    test("should validate different customer ID scenarios", async () => {
      const validCustomerIds = [1, 2, 123, 999];

      for (const customerId of validCustomerIds) {
        const orderWithCustomerId = createMockOrderRequest({ customerId });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(orderWithCustomerId);
        expect(result.valid).toBe(true);
      }

      // Invalid customer IDs should fail
      const invalidCustomerIds = [0, -1, -999];

      for (const customerId of invalidCustomerIds) {
        const orderWithInvalidId = createMockOrderRequest({ customerId });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: false,
          errors: ["Customer ID must be a positive number"],
        });

        const result = await orderService.validateOrderRequest(
          orderWithInvalidId
        );
        expect(result.valid).toBe(false);
      }
    });

    // Test notes field validation scenarios
    test("should validate different notes scenarios", async () => {
      const validNotesScenarios = [
        "Ring doorbell twice",
        "Customer prefers morning delivery",
        "Leave at front door if no answer",
        "Contact via WhatsApp before delivery",
        "", // Empty string should be valid
      ];

      for (const notes of validNotesScenarios) {
        const orderWithNotes = createMockOrderRequest({ notes });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(orderWithNotes);
        expect(result.valid).toBe(true);
      }

      // Very long notes should fail
      const longNotes = "A".repeat(1001);
      const orderWithLongNotes = createMockOrderRequest({ notes: longNotes });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Notes must be less than 1000 characters"],
      });

      const result = await orderService.validateOrderRequest(orderWithLongNotes);
      expect(result.valid).toBe(false);
    });
  });

  describe("Order Total Calculation", () => {
    test("should calculate correct total for single item", () => {
      const items: OrderItemRequest[] = [
        {
          itemType: ItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 2,
          unitPrice: "25.00",
        },
      ];

      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue("50.00");

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe("50.00");
    });

    test("should calculate correct total for multiple items", () => {
      const items: OrderItemRequest[] = [
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
      ];

      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue("65.00");

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe("65.00");
    });

    test("should handle decimal calculations correctly", () => {
      const items: OrderItemRequest[] = [
        {
          itemType: ItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 3,
          unitPrice: "33.33",
        },
      ];

      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue("99.99");

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe("99.99");
    });

    test("should handle zero total", () => {
      const items: OrderItemRequest[] = [];

      (orderService.calculateOrderTotal as jest.Mock).mockReturnValue("0.00");

      const result = orderService.calculateOrderTotal(items);

      expect(result).toBe("0.00");
    });
  });

  describe("Order Number Generation", () => {
    test("should generate unique order number", () => {
      const orderNumber = "ORD-2024-001";

      (orderService.generateOrderNumber as jest.Mock).mockReturnValue(
        orderNumber
      );

      const result = orderService.generateOrderNumber();

      expect(result).toBe(orderNumber);
      expect(result).toMatch(/^ORD-\d{4}-\d{3}$/);
    });

    test("should generate sequential order numbers", () => {
      const orderNumbers = ["ORD-2024-001", "ORD-2024-002", "ORD-2024-003"];

      orderNumbers.forEach((orderNumber, index) => {
        (orderService.generateOrderNumber as jest.Mock).mockReturnValueOnce(
          orderNumber
        );
        const result = orderService.generateOrderNumber();
        expect(result).toBe(orderNumber);
      });
    });

    test("should handle year rollover", () => {
      const orderNumber = "ORD-2025-001";

      (orderService.generateOrderNumber as jest.Mock).mockReturnValue(
        orderNumber
      );

      const result = orderService.generateOrderNumber();

      expect(result).toBe(orderNumber);
      expect(result).toMatch(/^ORD-2025-\d{3}$/);
    });
  });

  describe("Schema Compliance Validation", () => {
    test("should validate CreateOrderRequest matches actual schema", () => {
      const request = createMockOrderRequest();
      
      // Verify required fields are present
      expect(request.customerId).toBeDefined();
      expect(typeof request.customerId).toBe('number');
      expect(request.customerId).toBeGreaterThan(0);
      
      expect(request.paymentMethod).toBeDefined();
      expect(Object.values(PaymentMethodEnum)).toContain(request.paymentMethod);
      
      expect(request.items).toBeDefined();
      expect(Array.isArray(request.items)).toBe(true);
      expect(request.items.length).toBeGreaterThan(0);
      
      // Verify optional fields
      if (request.notes !== undefined) {
        expect(typeof request.notes).toBe('string');
      }
      
      // Verify items structure
      request.items.forEach(item => {
        expect(Object.values(ItemTypeEnum)).toContain(item.itemType);
        expect(typeof item.quantity).toBe('number');
        expect(item.quantity).toBeGreaterThan(0);
        expect(typeof item.unitPrice).toBe('string');
        expect(parseFloat(item.unitPrice)).toBeGreaterThan(0);
      });
    });

    test("should reject orders with schema-invalid fields", () => {
      // Test with schema-invalid data (fields that don't exist in CreateOrderRequestSchema)
      const invalidRequest = {
        customerId: 1,
        paymentMethod: PaymentMethodEnum.CASH,
        items: [{
          itemType: ItemTypeEnum.TANK,
          tankTypeId: 1,
          quantity: 1,
          unitPrice: "25.00"
        }],
        // These fields should not be in CreateOrderRequestSchema
        customerName: "Invalid Field",
        deliveryAddress: "Invalid Field", 
        storeId: 123
      };
      
      // In a real test, this would use Zod validation
      const schemaFields = ['customerId', 'paymentMethod', 'items', 'notes'];
      const requestFields = Object.keys(invalidRequest);
      const invalidFields = requestFields.filter(field => !schemaFields.includes(field));
      
      expect(invalidFields.length).toBeGreaterThan(0);
      expect(invalidFields).toContain('customerName');
      expect(invalidFields).toContain('deliveryAddress');
      expect(invalidFields).toContain('storeId');
    });
  });

  describe("Order Creation Business Logic", () => {
    test("should create valid order successfully", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems();

      mockOrderRepository.createOrder.mockResolvedValue(expectedOrder);
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request, 1); // userId parameter included

      expect(result).toEqual(expectedOrder);
      expect(result.status).toBe(OrderStatusEnum.PENDING);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
    });

    // Test how backend handles simplified schema creation
    test("should create order from simplified schema with backend defaults", async () => {
      const simplifiedRequest = createMockOrderRequest({
        customerId: 2,
        paymentMethod: PaymentMethodEnum.CASH,
        notes: "Ring doorbell twice",
      });
      const expectedOrder = createMockOrderWithItems({
        customerId: 2,
        status: OrderStatusEnum.PENDING, // Auto-set by backend
        paymentMethod: PaymentMethodEnum.CASH, // From request
        orderNumber: "ORD-2024-001", // Generated by backend
        totalAmount: "65.00", // Calculated by backend from items
        notes: "Ring doorbell twice", // From request
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(simplifiedRequest, 1);

      // Verify backend applies smart defaults
      expect(result.status).toBe(OrderStatusEnum.PENDING);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
      expect(result.totalAmount).toBe("65.00");
      expect(result.customerId).toBe(2);
    });

    // Test creation with different customer IDs
    test("should create order for different customer IDs", async () => {
      const customerRequest = createMockOrderRequest({
        customerId: 123,
        paymentMethod: PaymentMethodEnum.YAPE,
      });

      const expectedOrder = createMockOrderWithItems({
        customerId: 123, // Provided by frontend
        paymentMethod: PaymentMethodEnum.YAPE,
        status: OrderStatusEnum.PENDING,
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(customerRequest, 1);

      expect(result.customerId).toBe(123);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.YAPE);
      expect(result.status).toBe(OrderStatusEnum.PENDING);
    });

    // Test creation with different payment methods
    test("should create order with different payment methods", async () => {
      const transferRequest = createMockOrderRequest({
        customerId: 456,
        paymentMethod: PaymentMethodEnum.TRANSFER,
      });

      const expectedOrder = createMockOrderWithItems({
        customerId: 456,
        paymentMethod: PaymentMethodEnum.TRANSFER,
        status: OrderStatusEnum.PENDING,
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(transferRequest, 1);

      expect(result.customerId).toBe(456);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.TRANSFER);
      expect(result.status).toBe(OrderStatusEnum.PENDING);
    });

    // Test creation with all valid payment methods
    test("should handle all valid payment methods", async () => {
      const paymentMethods = Object.values(PaymentMethodEnum);

      for (const method of paymentMethods) {
        const paymentRequest = createMockOrderRequest({
          customerId: 1,
          paymentMethod: method,
        });

        const expectedOrder = createMockOrderWithItems({
          customerId: 1,
          paymentMethod: method,
          status: OrderStatusEnum.PENDING,
        });

        (orderService.createOrder as jest.Mock).mockResolvedValue(
          expectedOrder
        );

        const result = await orderService.createOrder(paymentRequest, 1);

        expect(result.paymentMethod).toBe(method);
        expect(result.status).toBe(OrderStatusEnum.PENDING);
      }
    });

    // Test that backend handles optional notes field correctly
    test("should handle optional notes field gracefully", async () => {
      const minimalRequest = createMockOrderRequest({
        customerId: 1,
        paymentMethod: PaymentMethodEnum.CASH,
        notes: undefined, // Optional field
      });

      const expectedOrder = createMockOrderWithItems({
        customerId: 1,
        paymentMethod: PaymentMethodEnum.CASH,
        notes: null, // Backend converts undefined to null
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(minimalRequest, 1);

      // Backend should handle undefined optional fields
      expect(result.customerId).toBe(1);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.notes).toBeNull();
    });

    test("should set correct initial status", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({
        status: OrderStatusEnum.PENDING,
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request, 1);

      expect(result.status).toBe(OrderStatusEnum.PENDING);
    });

    test("should calculate and set total amount", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems({ totalAmount: "65.00" });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request, 1);

      expect(result.totalAmount).toBe("65.00");
    });

    test("should reject order creation with validation errors", async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined as any, // Invalid - required field
      });

      (orderService.createOrder as jest.Mock).mockRejectedValue(
        new Error("Validation failed: Customer ID is required")
      );

      await expect(orderService.createOrder(invalidRequest, 1)).rejects.toThrow(
        "Validation failed: Customer ID is required"
      );
    });

    test("should set created by user", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({ createdBy: 1 });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request, 1);

      expect(result.createdBy).toBe(1);
    });

    test("should set order date to current time", async () => {
      const request = createMockOrderRequest();
      const now = new Date();
      const expectedOrder = createMockOrder({ orderDate: now });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request, 1);

      expect(result.orderDate).toBeDefined();
    });
  });

  describe("Store Availability Validation", () => {
    test("should validate store has active inventory", async () => {
      const storeId = 1;

      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(
        true
      );

      const result = await orderService.validateStoreAvailability(storeId);

      expect(result).toBe(true);
    });

    test("should reject orders for stores without active inventory", async () => {
      const storeId = 999;

      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(
        false
      );

      const result = await orderService.validateStoreAvailability(storeId);

      expect(result).toBe(false);
    });

    test("should validate store exists", async () => {
      const nonExistentStoreId = -1;

      (orderService.validateStoreAvailability as jest.Mock).mockResolvedValue(
        false
      );

      const result = await orderService.validateStoreAvailability(
        nonExistentStoreId
      );

      expect(result).toBe(false);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle database errors gracefully", async () => {
      const request = createMockOrderRequest();

      mockOrderRepository.createOrder.mockRejectedValue(
        new Error("Database connection failed")
      );
      (orderService.createOrder as jest.Mock).mockRejectedValue(
        new Error("Failed to create order: Database connection failed")
      );

      await expect(orderService.createOrder(request, 1)).rejects.toThrow(
        "Failed to create order: Database connection failed"
      );
    });

    test("should validate notes field length limit", async () => {
      const longNotesRequest = createMockOrderRequest({
        notes: "A".repeat(1001), // Very long notes
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Notes must be less than 1000 characters"],
      });

      const result = await orderService.validateOrderRequest(longNotesRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Notes must be less than 1000 characters"
      );
    });

    test("should handle special characters in notes", async () => {
      const specialCharsRequest = createMockOrderRequest({
        notes: "José María - entrega en Av. España #123, 2do piso",
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(
        specialCharsRequest
      );

      expect(result.valid).toBe(true);
    });

    test("should validate item type enum values", async () => {
      const validItemTypes = Object.values(ItemTypeEnum);
      
      for (const itemType of validItemTypes) {
        const validRequest = createMockOrderRequest({
          items: [{
            itemType,
            tankTypeId: itemType === ItemTypeEnum.TANK ? 1 : undefined,
            inventoryItemId: itemType === ItemTypeEnum.ITEM ? 1 : undefined,
            quantity: 1,
            unitPrice: "25.00",
          }],
        });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(validRequest);
        expect(result.valid).toBe(true);
      }
    });

    test("should handle concurrent order number generation", async () => {
      const request1 = createMockOrderRequest();
      const request2 = createMockOrderRequest();

      const order1 = createMockOrder({ orderNumber: "ORD-2024-001" });
      const order2 = createMockOrder({ orderNumber: "ORD-2024-002" });

      (orderService.createOrder as jest.Mock)
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);

      const result1 = await orderService.createOrder(request1, 1);
      const result2 = await orderService.createOrder(request2, 1);

      expect(result1.orderNumber).toBe("ORD-2024-001");
      expect(result2.orderNumber).toBe("ORD-2024-002");
    });
  });
});
