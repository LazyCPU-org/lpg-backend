import { eq } from "drizzle-orm";
import { db } from "../../db";
import { customers } from "../../db/schemas/customers/customers";
import { stores } from "../../db/schemas/locations/stores";
import {
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "../../db/schemas/orders/order-status-types";
import { users } from "../../db/schemas/user-management/users";
import { IOrderValidationService } from "./IOrderValidationService";

export class OrderValidationService implements IOrderValidationService {
  async validateOrderData(
    customerName: string,
    customerPhone: string,
    deliveryAddress: string,
    paymentMethod: PaymentMethodEnum,
    paymentStatus: PaymentStatusEnum,
    createdBy: number,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Note: Store validation removed since orders start as PENDING without store assignment

    // Validate creating user exists
    const user = await db.query.users.findFirst({
      where: eq(users.userId, createdBy),
    });
    if (!user) {
      errors.push("Creating user not found");
    }

    // Validate customer exists if customerId provided
    if (customerId) {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.customerId, customerId),
      });
      if (!customer) {
        errors.push("Customer not found");
      }
    }

    // Validate required fields
    if (!customerName.trim()) {
      errors.push("Customer name is required");
    }
    if (!customerPhone.trim()) {
      errors.push("Customer phone is required");
    }
    if (!deliveryAddress.trim()) {
      errors.push("Delivery address is required");
    }

    // Validate enum values
    if (!Object.values(PaymentMethodEnum).includes(paymentMethod)) {
      errors.push("Invalid payment method");
    }
    if (!Object.values(PaymentStatusEnum).includes(paymentStatus)) {
      errors.push("Invalid payment status");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}