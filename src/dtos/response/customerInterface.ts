// customerInterface.ts - Customer response types following established patterns

import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { customers, CustomerTypeEnum } from "../../db/schemas/customers";

/**
 * @openapi
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         customerId:
 *           type: integer
 *           description: The auto-generated id of the customer
 *         firstName:
 *           type: string
 *           description: Customer's first name
 *         lastName:
 *           type: string
 *           description: Customer's last name
 *         phoneNumber:
 *           type: string
 *           description: Primary phone number (Peruvian format)
 *         alternativePhone:
 *           type: string
 *           nullable: true
 *           description: Alternative phone number
 *         address:
 *           type: string
 *           description: Customer's primary address
 *         locationReference:
 *           type: string
 *           nullable: true
 *           description: Address reference or landmark
 *         customerType:
 *           type: string
 *           enum: [regular, wholesale, recurrent]
 *           description: Type of customer
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           nullable: true
 *           description: Customer rating (1-5 stars)
 *         isActive:
 *           type: boolean
 *           description: Whether the customer is active
 *         lastOrderDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date of last order placed
 *         preferredPaymentMethod:
 *           type: string
 *           nullable: true
 *           description: Customer's preferred payment method
 *         totalOrders:
 *           type: integer
 *           description: Total number of orders placed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Customer creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - customerId
 *         - firstName
 *         - lastName
 *         - phoneNumber
 *         - address
 *         - customerType
 *         - isActive
 *         - totalOrders
 *     CustomerSearchResult:
 *       type: object
 *       properties:
 *         customerId:
 *           type: integer
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         address:
 *           type: string
 *         lastOrderDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         preferredPaymentMethod:
 *           type: string
 *           nullable: true
 *         totalOrders:
 *           type: integer
 *         customerType:
 *           type: string
 *           enum: [regular, wholesale, recurrent]
 */

export const InsertCustomerSchema = createInsertSchema(customers, {
  customerType: z.nativeEnum(CustomerTypeEnum).default(CustomerTypeEnum.REGULAR),
  rating: z.number().min(1).max(5).optional(),
});

const SelectCustomerSchema = createSelectSchema(customers, {
  customerType: z.nativeEnum(CustomerTypeEnum),
  rating: z.number().min(1).max(5).optional(),
});

// Base customer types
export type Customer = z.infer<typeof SelectCustomerSchema>;
export type NewCustomer = z.infer<typeof InsertCustomerSchema>;

// UX Design Pattern: Customer search result for phone lookup
export interface CustomerSearchResult {
  customerId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  locationReference?: string | null;
  lastOrderDate?: string | null; // For "Last order: 1 week ago"
  preferredPaymentMethod?: string | null; // For "Usually pays: Cash"
  totalOrders: number; // For relationship context
  customerType: string;
  rating?: number | null;
}

// UX Design Pattern: Customer info for order creation
export interface CustomerForOrder {
  customerId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  locationReference?: string | null;
  preferredPaymentMethod?: string | null;
}

// UX Design Pattern: Quick customer lookup (for autocomplete)
export interface CustomerQuickLookup {
  customerId: number;
  fullName: string; // firstName + lastName combined
  phoneNumber: string;
  shortAddress: string; // Abbreviated address for display
  lastOrderSummary?: string | null; // "2x 20kg (1 week ago)"
}

// Customer with order history (for detailed view)
export interface CustomerWithOrders extends Customer {
  orders: Array<{
    orderId: number;
    orderNumber: string;
    orderDate: string;
    status: string;
    totalAmount: string;
    paymentMethod: string;
    paymentStatus: string;
  }>;
  totalOrderValue: string; // Sum of all orders
  averageOrderValue: string; // Average order amount
}

// Customer with debt information
export interface CustomerWithDebts extends Customer {
  debts: Array<{
    debtId: number;
    amount: string;
    description: string;
    debtDate: string;
    dueDate?: string | null;
    isPaid: boolean;
  }>;
  totalDebt: string; // Sum of unpaid debts
  hasOverdueDebts: boolean;
}

// Customer analytics (for business insights)
export interface CustomerAnalytics {
  customerId: number;
  fullName: string;
  customerType: string;
  totalOrders: number;
  totalOrderValue: string;
  averageOrderValue: string;
  lastOrderDate?: string | null;
  daysSinceLastOrder?: number | null;
  orderFrequency: 'high' | 'medium' | 'low'; // Based on order patterns
  preferredPaymentMethod?: string | null;
  rating?: number | null;
  riskLevel: 'low' | 'medium' | 'high'; // Based on debts and payment history
}

// Relation options for repository queries
export interface CustomerRelationOptions {
  orders?: boolean; // Include order history
  debts?: boolean; // Include debt information
  analytics?: boolean; // Include analytical data
}

// Union type for repository return
export type CustomerWithRelations =
  | Customer
  | CustomerWithOrders
  | CustomerWithDebts
  | (CustomerWithOrders & CustomerWithDebts);

// Phone number utilities for Peruvian format
export const formatPeruvianPhone = (phone: string): string => {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it already starts with +51, return as is
  if (cleaned.startsWith('+51')) {
    return cleaned;
  }
  
  // If it's 9 digits, add +51 prefix
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return `+51${cleaned}`;
  }
  
  return phone; // Return original if format is unclear
};

export const displayPeruvianPhone = (phone: string): string => {
  if (phone.startsWith('+51')) {
    // Format as: +51 987 654 321
    const number = phone.substring(3);
    return `+51 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }
  return phone;
};

// Customer type utilities
export const getCustomerTypeDisplay = (type: string): string => {
  switch (type) {
    case CustomerTypeEnum.REGULAR:
      return 'Cliente Regular';
    case CustomerTypeEnum.WHOLESALE:
      return 'Cliente Mayorista';
    case CustomerTypeEnum.RECURRENT:
      return 'Cliente Recurrente';
    default:
      return 'Tipo Desconocido';
  }
};

// Rating utilities
export const getRatingDisplay = (rating?: number | null): string => {
  if (!rating) return 'Sin calificación';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};