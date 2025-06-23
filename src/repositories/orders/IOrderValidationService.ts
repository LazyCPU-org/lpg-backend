import {
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";

export abstract class IOrderValidationService {
  abstract validateOrderData(
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }>;
}