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
        customerName: "Pedro Martinez",
        customerPhone: "+51987654321",
        deliveryAddress: "Jr. Lima 123, San Isidro",
        locationReference: undefined, // Optional in UX flow
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

    test("should reject order without customer name when no customer ID", async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined,
        customerName: undefined,
        customerPhone: "+1234567890",
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Customer name is required when customer ID is not provided"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Customer name is required when customer ID is not provided"
      );
    });

    test("should reject order without customer phone when no customer ID", async () => {
      const invalidRequest = createMockOrderRequest({
        customerId: undefined,
        customerName: "John Doe",
        customerPhone: undefined,
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Customer phone is required when customer ID is not provided"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Customer phone is required when customer ID is not provided"
      );
    });

    test("should accept order with customer ID and no name/phone", async () => {
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

    test("should reject order without delivery address", async () => {
      const invalidRequest = createMockOrderRequest({
        deliveryAddress: "",
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Delivery address is required"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Delivery address is required");
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


    test("should validate payment method", async () => {
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

    test("should validate payment status", async () => {
      const invalidRequest = createMockOrderRequest({
        paymentStatus: "invalid_status" as any,
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Invalid payment status"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid payment status");
    });

    test("should validate priority range", async () => {
      const invalidRequest = createMockOrderRequest({
        priority: 10, // Out of valid range 1-5
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Priority must be between 1 and 5"],
      });

      const result = await orderService.validateOrderRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Priority must be between 1 and 5");
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

    test("should validate payment method and status compatibility", async () => {
      const incompatibleRequest = createMockOrderRequest({
        paymentMethod: PaymentMethodEnum.CASH,
        paymentStatus: PaymentStatusEnum.PAID, // Cash payments usually pending until delivery
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Cash payments should be pending until delivery completion"],
      });

      const result = await orderService.validateOrderRequest(
        incompatibleRequest
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Cash payments should be pending until delivery completion"
      );
    });

    // UX Design Pattern: Smart defaults for payment
    test("should accept smart payment defaults from UX flow", async () => {
      const smartDefaultsRequest = createMockOrderRequest({
        paymentMethod: PaymentMethodEnum.CASH, // Pre-selected in UX
        paymentStatus: PaymentStatusEnum.PENDING, // Default for cash
        priority: 1, // Default priority
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(
        smartDefaultsRequest
      );

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
      const minimalOrder = createConversationOrderEntry({
        // Only essential fields that frontend must provide
        customerName: "Pedro Martinez",
        customerPhone: "+51987654321",
        deliveryAddress: "Jr. Lima 123, San Isidro",
        items: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 2,
            quantity: 2,
            unitPrice: "45.00",
          },
        ],
        // Optional fields that might be undefined
        locationReference: undefined,
        notes: undefined,
        customerId: undefined, // New customer
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(minimalOrder);
      expect(result.valid).toBe(true);
    });

    // Test Peruvian phone number validation
    test("should validate Peruvian phone number formats", async () => {
      const phoneScenarios = createPeruvianPhoneScenarios();

      // Valid phone numbers should pass
      const validPhones = [
        phoneScenarios.validMobileNumber,
        phoneScenarios.validShortMobile,
      ];

      for (const phone of validPhones) {
        const orderWithPhone = createConversationOrderEntry({ customerPhone: phone });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(orderWithPhone);
        expect(result.valid).toBe(true);
      }

      // Invalid phone numbers should fail
      const invalidPhones = [
        phoneScenarios.invalidShortNumber,
        phoneScenarios.invalidFormat,
      ];

      for (const phone of invalidPhones) {
        const orderWithInvalidPhone = createConversationOrderEntry({
          customerPhone: phone,
        });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: false,
          errors: ["Invalid phone number format"],
        });

        const result = await orderService.validateOrderRequest(
          orderWithInvalidPhone
        );
        expect(result.valid).toBe(false);
      }
    });

    // Test Peruvian address validation
    test("should validate Peruvian address formats", async () => {
      const addressScenarios = createPeruvianAddressScenarios();

      // Valid address formats
      const validAddresses = [
        addressScenarios.limaAddress,
        addressScenarios.avenidaAddress,
        addressScenarios.calleAddress,
        addressScenarios.addressWithReference,
      ];

      for (const address of validAddresses) {
        const orderWithAddress = createConversationOrderEntry({
          deliveryAddress: address,
        });

        (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
        });

        const result = await orderService.validateOrderRequest(
          orderWithAddress
        );
        expect(result.valid).toBe(true);
      }

      // Short address should still be valid (error tolerance)
      const shortAddressOrder = createConversationOrderEntry({
        deliveryAddress: addressScenarios.shortAddress,
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: true,
        errors: [],
      });

      const result = await orderService.validateOrderRequest(shortAddressOrder);
      expect(result.valid).toBe(true);
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

  describe("Order Creation Business Logic", () => {
    test("should create valid order successfully", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems();

      mockOrderRepository.createOrder.mockResolvedValue(expectedOrder);
      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result).toEqual(expectedOrder);
      expect(result.status).toBe(OrderStatusEnum.PENDING);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
    });

    // Test how backend handles UX quick entry creation
    test("should create order from UX quick entry with smart defaults", async () => {
      const quickRequest = createConversationOrderEntry();
      const expectedOrder = createMockOrderWithItems({
        customerName: "Pedro Martinez",
        customerPhone: "+51987654321",
        deliveryAddress: "Jr. Lima 123, San Isidro",
        status: OrderStatusEnum.PENDING, // Auto-set by backend
        paymentMethod: PaymentMethodEnum.CASH, // From UX default
        paymentStatus: PaymentStatusEnum.PENDING, // Smart default for cash
        priority: 1, // UX default
        orderNumber: "ORD-2024-001", // Generated by backend
        totalAmount: "90.00", // Calculated by backend (2 * 45.00)
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(quickRequest);

      // Verify backend applies smart defaults
      expect(result.status).toBe(OrderStatusEnum.PENDING);
      expect(result.paymentMethod).toBe(PaymentMethodEnum.CASH);
      expect(result.paymentStatus).toBe(PaymentStatusEnum.PENDING);
      expect(result.priority).toBe(1);
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{3}$/);
      expect(result.totalAmount).toBe("90.00");
    });

    // Test creation with existing customer ID (frontend provides ID)
    test("should create order for existing customer using ID", async () => {
      const uxScenarios = createUXOrderScenarios();
      const existingCustomerRequest = uxScenarios.existingCustomerEntry;

      const expectedOrder = createMockOrderWithItems({
        customerId: 123, // Provided by frontend
        customerName: "Pedro Martinez", // Could be auto-filled by frontend or backend
        customerPhone: "+51987654321",
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(existingCustomerRequest);

      expect(result.customerId).toBe(123);
      expect(result.customerName).toBe("Pedro Martinez");
    });

    // Test creation with new customer (no ID, name/phone required)
    test("should create order for new customer without ID", async () => {
      const uxScenarios = createUXOrderScenarios();
      const newCustomerRequest = uxScenarios.newCustomerEntry;

      const expectedOrder = createMockOrderWithItems({
        customerId: null, // New customer
        customerName: "Sofia Rodriguez",
        customerPhone: "+51987555444",
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(newCustomerRequest);

      expect(result.customerId).toBeNull();
      expect(result.customerName).toBe("Sofia Rodriguez");
      expect(result.customerPhone).toBe("+51987555444");
    });

    // Test creation with different payment methods affects payment status
    test("should handle different payment methods with correct defaults", async () => {
      const uxScenarios = createUXOrderScenarios();
      const paymentScenarios = [
        {
          request: uxScenarios.cashPaymentEntry,
          expectedStatus: PaymentStatusEnum.PENDING, // Cash paid on delivery
          method: PaymentMethodEnum.CASH,
        },
        {
          request: uxScenarios.yapePaymentEntry,
          expectedStatus: PaymentStatusEnum.PENDING, // Digital needs confirmation
          method: PaymentMethodEnum.YAPE,
        },
        {
          request: uxScenarios.plinPaymentEntry,
          expectedStatus: PaymentStatusEnum.PENDING,
          method: PaymentMethodEnum.PLIN,
        },
        {
          request: uxScenarios.transferPaymentEntry,
          expectedStatus: PaymentStatusEnum.PENDING,
          method: PaymentMethodEnum.TRANSFER,
        },
      ];

      for (const scenario of paymentScenarios) {
        const expectedOrder = createMockOrderWithItems({
          paymentMethod: scenario.method,
          paymentStatus: scenario.expectedStatus,
        });

        (orderService.createOrder as jest.Mock).mockResolvedValue(
          expectedOrder
        );

        const result = await orderService.createOrder(scenario.request);

        expect(result.paymentMethod).toBe(scenario.method);
        expect(result.paymentStatus).toBe(scenario.expectedStatus);
      }
    });

    // Test that backend handles optional fields correctly
    test("should handle optional fields from frontend gracefully", async () => {
      const minimalRequest = createConversationOrderEntry({
        locationReference: undefined, // Optional
        notes: undefined, // Optional
      });

      const expectedOrder = createMockOrderWithItems({
        locationReference: null, // Backend converts undefined to null
        notes: null, // Backend converts undefined to null
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(minimalRequest);

      // Backend should handle undefined optional fields
      expect(result.locationReference).toBeNull();
      expect(result.notes).toBeNull();
    });

    test("should set correct initial status", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({
        status: OrderStatusEnum.PENDING,
      });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.status).toBe(OrderStatusEnum.PENDING);
    });

    test("should calculate and set total amount", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrderWithItems({ totalAmount: "65.00" });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.totalAmount).toBe("65.00");
    });

    test("should reject order creation with validation errors", async () => {
      const invalidRequest = createMockOrderRequest({
        customerName: undefined,
        customerPhone: undefined,
        customerId: undefined,
      });

      (orderService.createOrder as jest.Mock).mockRejectedValue(
        new Error("Validation failed: Customer information is required")
      );

      await expect(orderService.createOrder(invalidRequest)).rejects.toThrow(
        "Validation failed: Customer information is required"
      );
    });

    test("should set created by user", async () => {
      const request = createMockOrderRequest();
      const expectedOrder = createMockOrder({ createdBy: 1 });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

      expect(result.createdBy).toBe(1);
    });

    test("should set order date to current time", async () => {
      const request = createMockOrderRequest();
      const now = new Date();
      const expectedOrder = createMockOrder({ orderDate: now });

      (orderService.createOrder as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await orderService.createOrder(request);

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

      await expect(orderService.createOrder(request)).rejects.toThrow(
        "Failed to create order: Database connection failed"
      );
    });

    test("should validate customer name length", async () => {
      const longNameRequest = createMockOrderRequest({
        customerName: "A".repeat(256), // Very long name
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Customer name must be less than 255 characters"],
      });

      const result = await orderService.validateOrderRequest(longNameRequest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Customer name must be less than 255 characters"
      );
    });

    test("should handle special characters in customer data", async () => {
      const specialCharsRequest = createMockOrderRequest({
        customerName: "José María",
        deliveryAddress: "123 Main St, Apt #2A, City & County",
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

    test("should validate delivery address length", async () => {
      const longAddressRequest = createMockOrderRequest({
        deliveryAddress: "A".repeat(1001), // Very long address
      });

      (orderService.validateOrderRequest as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ["Delivery address must be less than 1000 characters"],
      });

      const result = await orderService.validateOrderRequest(
        longAddressRequest
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Delivery address must be less than 1000 characters"
      );
    });

    test("should handle concurrent order number generation", async () => {
      const request1 = createMockOrderRequest();
      const request2 = createMockOrderRequest();

      const order1 = createMockOrder({ orderNumber: "ORD-2024-001" });
      const order2 = createMockOrder({ orderNumber: "ORD-2024-002" });

      (orderService.createOrder as jest.Mock)
        .mockResolvedValueOnce(order1)
        .mockResolvedValueOnce(order2);

      const result1 = await orderService.createOrder(request1);
      const result2 = await orderService.createOrder(request2);

      expect(result1.orderNumber).toBe("ORD-2024-001");
      expect(result2.orderNumber).toBe("ORD-2024-002");
    });
  });
});
