import { CheckAvailabilityRequest } from "../../../../dtos/request/orderDTO";
import {
  AvailabilityResult,
  InventoryReservationType,
  NewInventoryReservationType,
} from "../../../../dtos/response/orderInterface";

export interface IReservationRepository {
  createReservationsForOrder(
    orderId: number,
    reservations: NewInventoryReservationType[]
  ): Promise<InventoryReservationType[]>;
  getActiveReservations(orderId: number): Promise<InventoryReservationType[]>;
  fulfillReservations(
    orderId: number,
    userId: number
  ): Promise<InventoryReservationType[]>;
  restoreReservations(
    orderId: number,
    reason: string
  ): Promise<InventoryReservationType[]>;
  checkAvailability(
    request: CheckAvailabilityRequest
  ): Promise<AvailabilityResult>;
  // Transaction-aware methods
  createReservationsWithTransaction(
    orderId: number,
    reservations: NewInventoryReservationType[],
    trx: any
  ): Promise<InventoryReservationType[]>;
  fulfillReservationsWithTransaction(
    orderId: number,
    userId: number,
    trx: any
  ): Promise<InventoryReservationType[]>;
  restoreReservationsWithTransaction(
    orderId: number,
    reason: string,
    trx: any
  ): Promise<InventoryReservationType[]>;
}

export const createMockReservationRepository =
  (): jest.Mocked<IReservationRepository> => ({
    createReservationsForOrder: jest.fn(),
    getActiveReservations: jest.fn(),
    fulfillReservations: jest.fn(),
    restoreReservations: jest.fn(),
    checkAvailability: jest.fn(),
    createReservationsWithTransaction: jest.fn(),
    fulfillReservationsWithTransaction: jest.fn(),
    restoreReservationsWithTransaction: jest.fn(),
  });
