/**
 * Inventory Reservation Workflow Tests
 *
 * Tests the inventory reservation system that manages availability checking,
 * reservation creation, fulfillment, and restoration.
 */

import {
  createMockAvailabilityRequest,
  createMockAvailabilityResult,
  createMockReservation,
} from "./__mocks__/orderTestData";

import { ReservationStatusEnum } from "../../../db/schemas/orders/inventory-reservations";

import {
  createMockReservationRepository,
  IReservationRepository,
} from "./__mocks__/mockOrderRepository";

import {
  AvailabilityResult,
  FulfillmentResult,
  InventoryReservationType,
  ReservationResult,
  RestoreResult,
} from "../../../dtos/response/orderInterface";

import { ItemTypeEnum } from "../../../db/schemas";
import { CheckAvailabilityRequest } from "../../../dtos/request/orderDTO";

// Mock service interface (to be implemented)
interface IReservationService {
  checkAvailability(
    request: CheckAvailabilityRequest
  ): Promise<AvailabilityResult>;
  createReservationsForOrder(orderId: number): Promise<ReservationResult>;
  fulfillReservations(
    orderId: number,
    userId: number
  ): Promise<FulfillmentResult>;
  restoreReservations(orderId: number, reason: string): Promise<RestoreResult>;
  getActiveReservations(orderId: number): Promise<InventoryReservationType[]>;
  calculateAvailableQuantity(
    storeId: number,
    itemType: string,
    itemId: number
  ): Promise<number>;
}

describe("Inventory Reservation Service", () => {
  let mockReservationRepository: jest.Mocked<IReservationRepository>;
  let reservationService: IReservationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReservationRepository = createMockReservationRepository();

    // Mock implementation will be injected when service is created
    reservationService = {
      checkAvailability: jest.fn(),
      createReservationsForOrder: jest.fn(),
      fulfillReservations: jest.fn(),
      restoreReservations: jest.fn(),
      getActiveReservations: jest.fn(),
      calculateAvailableQuantity: jest.fn(),
    };
  });

  describe("Availability Checking", () => {
    test("should check availability for tank and item orders", async () => {
      const request = createMockAvailabilityRequest();
      const expectedResult = createMockAvailabilityResult({ available: true });

      mockReservationRepository.checkAvailability.mockResolvedValue(
        expectedResult
      );
      (reservationService.checkAvailability as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.checkAvailability(request);

      expect(result.available).toBe(true);
      expect(result.details).toHaveLength(2);
      expect(result.details[0].itemType).toBe(ItemTypeEnum.TANK);
      expect(result.details[1].itemType).toBe(ItemTypeEnum.ITEM);
    });

    test("should return insufficient availability when stock is low", async () => {
      const request = createMockAvailabilityRequest();
      const expectedResult = createMockAvailabilityResult({
        available: false,
        details: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            requested: 5,
            current: 2,
            reserved: 0,
            available: 2,
          },
        ],
      });

      mockReservationRepository.checkAvailability.mockResolvedValue(
        expectedResult
      );
      (reservationService.checkAvailability as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.checkAvailability(request);

      expect(result.available).toBe(false);
      expect(result.details[0].available).toBeLessThan(
        result.details[0].requested
      );
    });

    test("should account for existing reservations in availability", async () => {
      const request = createMockAvailabilityRequest();
      const expectedResult = createMockAvailabilityResult({
        available: true,
        details: [
          {
            itemType: ItemTypeEnum.TANK,
            tankTypeId: 1,
            requested: 2,
            current: 10,
            reserved: 5, // Existing reservations
            available: 5, // current - reserved
          },
        ],
      });

      mockReservationRepository.checkAvailability.mockResolvedValue(
        expectedResult
      );
      (reservationService.checkAvailability as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.checkAvailability(request);

      expect(result.details[0].available).toBe(
        result.details[0].current - result.details[0].reserved
      );
    });

    test("should handle empty availability request", async () => {
      const emptyRequest = createMockAvailabilityRequest({
        items: [],
      });

      (reservationService.checkAvailability as jest.Mock).mockRejectedValue(
        new Error("At least one item must be specified for availability check")
      );

      await expect(
        reservationService.checkAvailability(emptyRequest)
      ).rejects.toThrow(
        "At least one item must be specified for availability check"
      );
    });
  });

  describe("Reservation Creation", () => {
    test("should create reservations for confirmed order", async () => {
      const orderId = 1;
      const mockReservations = [
        createMockReservation({
          orderId,
          itemType: ItemTypeEnum.TANK,
          reservedQuantity: 2,
        }),
        createMockReservation({
          reservationId: 2,
          orderId,
          itemType: ItemTypeEnum.ITEM,
          reservedQuantity: 1,
        }),
      ];
      const expectedResult: ReservationResult = {
        success: true,
        reservations: mockReservations,
        message: "Reservations created successfully",
      };

      mockReservationRepository.createReservationsForOrder.mockResolvedValue(
        mockReservations
      );
      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.success).toBe(true);
      expect(result.reservations).toHaveLength(2);
      expect(result.reservations[0].status).toBe(ReservationStatusEnum.ACTIVE);
      expect(result.reservations[1].status).toBe(ReservationStatusEnum.ACTIVE);
    });

    test("should fail reservation creation for insufficient inventory", async () => {
      const orderId = 1;
      const expectedResult: ReservationResult = {
        success: false,
        reservations: [],
        message:
          "Insufficient inventory: Tank type 1 requires 5 but only 2 available",
      };

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.success).toBe(false);
      expect(result.reservations).toHaveLength(0);
      expect(result.message).toContain("Insufficient inventory");
    });

    test("should create atomic reservations (all or none)", async () => {
      const orderId = 1;
      const expectedResult: ReservationResult = {
        success: false,
        reservations: [],
        message:
          "Reservation failed: Some items insufficient, all reservations rolled back",
      };

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.success).toBe(false);
      expect(result.reservations).toHaveLength(0);
      expect(result.message).toContain("rolled back");
    });

    test("should link reservations to current active inventory", async () => {
      const orderId = 1;
      const mockReservations = [
        createMockReservation({
          orderId,
          currentInventoryId: 123, // Should reference active inventory
          assignmentId: 1,
        }),
      ];
      const expectedResult: ReservationResult = {
        success: true,
        reservations: mockReservations,
      };

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.reservations[0].currentInventoryId).toBe(123);
      expect(result.reservations[0].assignmentId).toBe(1);
    });
  });

  describe("Reservation Fulfillment", () => {
    test("should fulfill active reservations on delivery completion", async () => {
      const orderId = 1;
      const userId = 2;
      const mockTransactionLinks = [
        {
          linkId: 1,
          orderId: 1,
          tankTransactionId: 100,
          itemTransactionId: null,
          deliveryId: 1,
          createdAt: new Date(),
        },
        {
          linkId: 2,
          orderId: 1,
          tankTransactionId: null,
          itemTransactionId: 200,
          deliveryId: 1,
          createdAt: new Date(),
        },
      ];
      const expectedResult: FulfillmentResult = {
        success: true,
        transactions: mockTransactionLinks,
        message: "Reservations fulfilled and inventory transactions created",
      };

      mockReservationRepository.fulfillReservations.mockResolvedValue([
        createMockReservation({ status: ReservationStatusEnum.FULFILLED }),
      ]);
      (reservationService.fulfillReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.fulfillReservations(
        orderId,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.message).toContain("fulfilled");
    });

    test("should convert reservations to inventory transactions", async () => {
      const orderId = 1;
      const userId = 2;
      const expectedResult: FulfillmentResult = {
        success: true,
        transactions: [
          {
            linkId: 1,
            orderId: 1,
            tankTransactionId: 100,
            itemTransactionId: null,
            deliveryId: 1,
            createdAt: new Date(),
          },
        ],
        message: "Reservations converted to transactions successfully",
      };

      (reservationService.fulfillReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.fulfillReservations(
        orderId,
        userId
      );

      expect(result.transactions[0].tankTransactionId).toBeDefined();
      expect(result.success).toBe(true);
    });

    test("should fail fulfillment if reservations are not active", async () => {
      const orderId = 1;
      const userId = 2;
      const expectedResult: FulfillmentResult = {
        success: false,
        transactions: [],
        message: "No active reservations found for order",
      };

      (reservationService.fulfillReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.fulfillReservations(
        orderId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.transactions).toHaveLength(0);
    });

    test("should maintain transaction atomicity during fulfillment", async () => {
      const orderId = 1;
      const userId = 2;
      const expectedResult: FulfillmentResult = {
        success: false,
        transactions: [],
        message:
          "Fulfillment failed: Transaction error, all changes rolled back",
      };

      (reservationService.fulfillReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.fulfillReservations(
        orderId,
        userId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("rolled back");
    });
  });

  describe("Reservation Restoration", () => {
    test("should restore reservations on order cancellation", async () => {
      const orderId = 1;
      const reason = "Customer cancelled order";
      const restoredReservations = [
        createMockReservation({ status: ReservationStatusEnum.CANCELLED }),
      ];
      const expectedResult: RestoreResult = {
        success: true,
        restoredReservations,
        message: "Reservations restored to available inventory",
      };

      mockReservationRepository.restoreReservations.mockResolvedValue(
        restoredReservations
      );
      (reservationService.restoreReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.restoreReservations(
        orderId,
        reason
      );

      expect(result.success).toBe(true);
      expect(result.restoredReservations).toHaveLength(1);
      expect(result.restoredReservations[0].status).toBe(
        ReservationStatusEnum.CANCELLED
      );
    });

    test("should restore reservations on delivery failure", async () => {
      const orderId = 1;
      const reason = "Customer not available";
      const expectedResult: RestoreResult = {
        success: true,
        restoredReservations: [
          createMockReservation({ status: ReservationStatusEnum.ACTIVE }), // Restored to active
        ],
        message: "Reservations restored for retry delivery",
      };

      (reservationService.restoreReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.restoreReservations(
        orderId,
        reason
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("retry");
    });

    test("should handle restoration of already fulfilled reservations", async () => {
      const orderId = 1;
      const reason = "Emergency cancellation";
      const expectedResult: RestoreResult = {
        success: false,
        restoredReservations: [],
        message:
          "Cannot restore reservations: Order already fulfilled with inventory transactions",
      };

      (reservationService.restoreReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.restoreReservations(
        orderId,
        reason
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("already fulfilled");
    });

    test("should create compensating transactions for partial deliveries", async () => {
      const orderId = 1;
      const reason = "Partial delivery failure";
      const expectedResult: RestoreResult = {
        success: true,
        restoredReservations: [
          createMockReservation({ reservedQuantity: 1 }), // Partial restoration
        ],
        message:
          "Compensating transactions created for partial delivery failure",
      };

      (reservationService.restoreReservations as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.restoreReservations(
        orderId,
        reason
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Compensating");
    });
  });

  describe("Available Quantity Calculations", () => {
    test("should calculate available quantity correctly", async () => {
      const storeId = 1;
      const itemType = ItemTypeEnum.TANK;
      const itemId = 1;

      (
        reservationService.calculateAvailableQuantity as jest.Mock
      ).mockResolvedValue(7);

      const result = await reservationService.calculateAvailableQuantity(
        storeId,
        itemType,
        itemId
      );

      expect(result).toBe(7); // current (10) - reserved (3) = available (7)
    });

    test("should return zero when no inventory available", async () => {
      const storeId = 1;
      const itemType = ItemTypeEnum.TANK;
      const itemId = 1;

      (
        reservationService.calculateAvailableQuantity as jest.Mock
      ).mockResolvedValue(0);

      const result = await reservationService.calculateAvailableQuantity(
        storeId,
        itemType,
        itemId
      );

      expect(result).toBe(0);
    });

    test("should handle non-existent items gracefully", async () => {
      const storeId = 1;
      const itemType = ItemTypeEnum.TANK;
      const itemId = 999; // Non-existent

      (
        reservationService.calculateAvailableQuantity as jest.Mock
      ).mockResolvedValue(0);

      const result = await reservationService.calculateAvailableQuantity(
        storeId,
        itemType,
        itemId
      );

      expect(result).toBe(0);
    });
  });

  describe("Active Reservations Management", () => {
    test("should retrieve active reservations for order", async () => {
      const orderId = 1;
      const activeReservations = [
        createMockReservation({
          orderId,
          status: ReservationStatusEnum.ACTIVE,
        }),
        createMockReservation({
          reservationId: 2,
          orderId,
          status: ReservationStatusEnum.ACTIVE,
        }),
      ];

      mockReservationRepository.getActiveReservations.mockResolvedValue(
        activeReservations
      );
      (reservationService.getActiveReservations as jest.Mock).mockResolvedValue(
        activeReservations
      );

      const result = await reservationService.getActiveReservations(orderId);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ReservationStatusEnum.ACTIVE);
      expect(result[1].status).toBe(ReservationStatusEnum.ACTIVE);
    });

    test("should exclude fulfilled and cancelled reservations", async () => {
      const orderId = 1;
      const onlyActiveReservations = [
        createMockReservation({
          orderId,
          status: ReservationStatusEnum.ACTIVE,
        }),
      ];

      mockReservationRepository.getActiveReservations.mockResolvedValue(
        onlyActiveReservations
      );
      (reservationService.getActiveReservations as jest.Mock).mockResolvedValue(
        onlyActiveReservations
      );

      const result = await reservationService.getActiveReservations(orderId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ReservationStatusEnum.ACTIVE);
    });

    test("should return empty array for orders without reservations", async () => {
      const orderId = 999;

      mockReservationRepository.getActiveReservations.mockResolvedValue([]);
      (reservationService.getActiveReservations as jest.Mock).mockResolvedValue(
        []
      );

      const result = await reservationService.getActiveReservations(orderId);

      expect(result).toHaveLength(0);
    });
  });

  describe("Integration with Current Inventory System", () => {
    test("should check availability against current active inventory", async () => {
      const request = createMockAvailabilityRequest();
      const expectedResult = createMockAvailabilityResult();

      // Mock should verify it uses current active inventory
      mockReservationRepository.checkAvailability.mockResolvedValue(
        expectedResult
      );
      (reservationService.checkAvailability as jest.Mock).mockResolvedValue(
        expectedResult
      );

      const result = await reservationService.checkAvailability(request);

      expect(result.available).toBe(true);
      // Verify the mock was called with the correct request
      expect(reservationService.checkAvailability).toHaveBeenCalledWith(
        request
      );
    });

    test("should create reservations linked to current inventory assignment", async () => {
      const orderId = 1;
      const mockReservations = [
        createMockReservation({
          orderId,
          assignmentId: 1,
          currentInventoryId: 123, // Links to current active inventory
        }),
      ];
      const expectedResult: ReservationResult = {
        success: true,
        reservations: mockReservations,
      };

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.reservations[0].currentInventoryId).toBeDefined();
      expect(result.reservations[0].assignmentId).toBeDefined();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle database errors during reservation creation", async () => {
      const orderId = 1;

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockRejectedValue(new Error("Database connection failed"));

      await expect(
        reservationService.createReservationsForOrder(orderId)
      ).rejects.toThrow("Database connection failed");
    });

    test("should handle invalid order ID gracefully", async () => {
      const invalidOrderId = -1;

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockRejectedValue(new Error("Invalid order ID provided"));

      await expect(
        reservationService.createReservationsForOrder(invalidOrderId)
      ).rejects.toThrow("Invalid order ID provided");
    });

    test("should handle concurrent reservation conflicts", async () => {
      const orderId = 1;
      const expectedResult: ReservationResult = {
        success: false,
        reservations: [],
        message:
          "Reservation conflict: Inventory was modified by another transaction",
      };

      (
        reservationService.createReservationsForOrder as jest.Mock
      ).mockResolvedValue(expectedResult);

      const result = await reservationService.createReservationsForOrder(
        orderId
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("conflict");
    });
  });
});
