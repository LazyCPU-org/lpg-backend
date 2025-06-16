import type { 
  ReservationMetrics, 
  OrderReservationSummary 
} from "./IInventoryReservationRepository";
import type { InventoryReservationType } from "../../../dtos/response/orderInterface";

export abstract class IReservationAnalyticsService {
  // Analytics and reporting operations
  abstract getReservationMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<ReservationMetrics>;

  abstract getOrderReservationSummary(
    orderId: number
  ): Promise<OrderReservationSummary>;

  abstract calculateReservationValue(
    reservations: InventoryReservationType[]
  ): Promise<string>;

  abstract optimizeReservations(assignmentId: number): Promise<{
    optimized: number;
    conflicts: Array<{
      itemType: string;
      itemId: number;
      totalReserved: number;
      available: number;
      shortage: number;
    }>;
  }>;
}