import type {
  Customer,
  NewCustomer,
  CustomerSearchResult,
  CustomerForOrder,
  CustomerWithOrders,
  CustomerWithDebts,
  CustomerAnalytics,
  CustomerRelationOptions,
} from "../../dtos/response/customerInterface";
import type { QuickCustomerCreation } from "../../dtos/request/customerDTO";

// Transaction type for dependency injection (following inventory pattern)
type DbTransaction = Parameters<
  Parameters<typeof import("../../db").db.transaction>[0]
>[0];

export abstract class ICustomerRepository {
  // Core CRUD operations
  abstract create(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    alternativePhone?: string,
    locationReference?: string,
    customerType?: string,
    rating?: number
  ): Promise<Customer>;

  abstract findById(customerId: number): Promise<Customer | null>;

  abstract findByIdWithRelations(
    customerId: number,
    relations?: CustomerRelationOptions
  ): Promise<Customer | CustomerWithOrders | CustomerWithDebts>;

  abstract update(
    customerId: number,
    updates: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      alternativePhone?: string;
      address?: string;
      locationReference?: string;
      customerType?: string;
      rating?: number;
      isActive?: boolean;
    }
  ): Promise<Customer>;

  abstract delete(customerId: number): Promise<void>;

  // UX Design Support - Critical for phone conversation flow
  abstract findByPhone(phone: string): Promise<CustomerSearchResult | null>;

  abstract searchByName(name: string): Promise<CustomerSearchResult[]>;

  abstract findByPhoneOrCreate(
    customerData: QuickCustomerCreation
  ): Promise<CustomerForOrder>;

  // Business Intelligence
  abstract findWithOrderHistory(customerId: number): Promise<CustomerWithOrders>;

  abstract findWithDebts(customerId: number): Promise<CustomerWithDebts>;

  abstract getCustomerAnalytics(customerId: number): Promise<CustomerAnalytics>;

  // Auto-Update Methods (for order lifecycle)
  abstract updateLastOrderDate(
    customerId: number,
    orderDate: Date
  ): Promise<void>;

  abstract incrementOrderCount(customerId: number): Promise<void>;

  abstract updatePreferredPayment(
    customerId: number,
    paymentMethod: string
  ): Promise<void>;

  // Transaction-aware operations
  abstract createWithTransaction(
    trx: DbTransaction,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    alternativePhone?: string,
    locationReference?: string,
    customerType?: string,
    rating?: number
  ): Promise<Customer>;

  abstract updateWithTransaction(
    trx: DbTransaction,
    customerId: number,
    updates: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      alternativePhone?: string;
      address?: string;
      locationReference?: string;
      customerType?: string;
      rating?: number;
      isActive?: boolean;
    }
  ): Promise<Customer>;

  abstract updateLastOrderDateWithTransaction(
    trx: DbTransaction,
    customerId: number,
    orderDate: Date
  ): Promise<void>;

  abstract incrementOrderCountWithTransaction(
    trx: DbTransaction,
    customerId: number
  ): Promise<void>;

  // Search and filtering operations
  abstract findActiveCustomers(limit?: number): Promise<Customer[]>;

  abstract findInactiveCustomers(limit?: number): Promise<Customer[]>;

  abstract findCustomersByType(customerType: string): Promise<Customer[]>;

  abstract findCustomersWithHighRating(minRating?: number): Promise<Customer[]>;

  abstract findRecentCustomers(days?: number): Promise<Customer[]>;

  // Customer metrics and analytics
  abstract getCustomerCount(): Promise<number>;

  abstract getCustomerMetrics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    averageRating: number;
    customersByType: Record<string, number>;
    newCustomersThisMonth: number;
  }>;

  abstract getTopCustomers(
    limit?: number,
    sortBy?: "orders" | "revenue" | "rating"
  ): Promise<Array<{
    customerId: number;
    fullName: string;
    phoneNumber: string;
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    rating?: number | null;
  }>>;

  // Validation and utility methods
  abstract validateCustomerData(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    customerId?: number // For updates, exclude self from phone uniqueness check
  ): Promise<{ valid: boolean; errors: string[] }>;

  abstract isPhoneNumberTaken(
    phoneNumber: string,
    excludeCustomerId?: number
  ): Promise<boolean>;

  abstract searchCustomers(
    query: string,
    limit?: number
  ): Promise<CustomerSearchResult[]>;

  abstract formatFullName(firstName: string, lastName: string): string;

  abstract parseFullName(fullName: string): { firstName: string; lastName: string };
}