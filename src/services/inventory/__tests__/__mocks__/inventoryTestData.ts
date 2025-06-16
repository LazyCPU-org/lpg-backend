import {
  ItemTypeEnum,
  ReservationStatusEnum,
} from "../../../../db/schemas/orders";
import { CheckAvailabilityRequest } from "../../../../dtos/request/orderDTO";
import {
  AvailabilityResult,
  InventoryReservationType,
} from "../../../../dtos/response/orderInterface";

export const createReservationScenario = () => ({
  availabilityRequest: createMockAvailabilityRequest(),
  sufficientInventory: createMockAvailabilityResult({ available: true }),
  insufficientInventory: createMockAvailabilityResult({
    available: false,
    details: [
      {
        itemType: ItemTypeEnum.TANK,
        tankTypeId: 1,
        requested: 2,
        current: 1,
        reserved: 0,
        available: 1,
      },
    ],
  }),
  activeReservations: [
    createMockReservation({ status: ReservationStatusEnum.ACTIVE }),
  ],
  fulfilledReservations: [
    createMockReservation({ status: ReservationStatusEnum.FULFILLED }),
  ],
});

export const createMockAvailabilityRequest = (
  overrides: Partial<CheckAvailabilityRequest> = {}
): CheckAvailabilityRequest => ({
  storeId: 1,
  items: [
    {
      itemType: ItemTypeEnum.TANK,
      tankTypeId: 1,
      quantity: 2,
    },
    {
      itemType: ItemTypeEnum.ITEM,
      inventoryItemId: 1,
      quantity: 1,
    },
  ],
  ...overrides,
});

export const createMockAvailabilityResult = (
  overrides: Partial<AvailabilityResult> = {}
): AvailabilityResult => ({
  available: true,
  details: [
    {
      itemType: ItemTypeEnum.TANK,
      tankTypeId: 1,
      requested: 2,
      current: 10,
      reserved: 3,
      available: 7,
    },
    {
      itemType: ItemTypeEnum.ITEM,
      inventoryItemId: 1,
      requested: 1,
      current: 5,
      reserved: 1,
      available: 4,
    },
  ],
  ...overrides,
});

export const createMockReservation = (
  overrides: Partial<InventoryReservationType> = {}
): InventoryReservationType => ({
  reservationId: 1,
  orderId: 1,
  assignmentId: 1,
  currentInventoryId: 1,
  itemType: ItemTypeEnum.TANK,
  tankTypeId: 1,
  inventoryItemId: null,
  reservedQuantity: 2,
  status: ReservationStatusEnum.ACTIVE,
  expiresAt: null,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-01T10:00:00Z"),
  ...overrides,
});
