import {
  and,
  avg,
  count,
  desc,
  eq,
  gte,
  ilike,
  or,
  sql,
  sum,
} from "drizzle-orm";
import { db } from "../../db";
import { customers, CustomerTypeEnum } from "../../db/schemas/customers";
import { customerDebts } from "../../db/schemas/customers/customer-debts";
import { orders } from "../../db/schemas/orders";
import { QuickCustomerCreation } from "../../dtos/request/customerDTO";
import {
  Customer,
  CustomerAnalytics,
  CustomerForOrder,
  CustomerRelationOptions,
  CustomerSearchResult,
  CustomerWithDebts,
  CustomerWithOrders,
  formatPeruvianPhone,
  NewCustomer,
} from "../../dtos/response/customerInterface";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
} from "../../utils/custom-errors";
import { ICustomerRepository } from "./ICustomerRepository";

// Transaction type for consistency
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class PgCustomerRepository implements ICustomerRepository {
  // Helper method to map database result to Customer type
  private mapToCustomer(dbCustomer: any): Customer {
    return {
      ...dbCustomer,
      customerType: dbCustomer.customerType || CustomerTypeEnum.REGULAR,
      totalOrders: dbCustomer.totalOrders || 0,
      rating: dbCustomer.rating ?? undefined,
    };
  }

  // Helper method to map database result to CustomerSearchResult type
  private mapToCustomerSearchResult(dbCustomer: any): CustomerSearchResult {
    return {
      customerId: dbCustomer.customerId,
      firstName: dbCustomer.firstName,
      lastName: dbCustomer.lastName,
      phoneNumber: dbCustomer.phoneNumber,
      address: dbCustomer.address,
      locationReference: dbCustomer.locationReference,
      lastOrderDate: dbCustomer.lastOrderDate?.toISOString() || null,
      preferredPaymentMethod: dbCustomer.preferredPaymentMethod,
      totalOrders: dbCustomer.totalOrders || 0,
      customerType: dbCustomer.customerType || CustomerTypeEnum.REGULAR,
      rating: dbCustomer.rating ?? undefined,
    };
  }

  async create(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    alternativePhone?: string,
    locationReference?: string,
    customerType?: string,
    rating?: number
  ): Promise<Customer> {
    // Validate input data
    const validation = await this.validateCustomerData(
      firstName,
      lastName,
      phoneNumber,
      address
    );

    if (!validation.valid) {
      throw new BadRequestError(
        `Invalid customer data: ${validation.errors.join(", ")}`
      );
    }

    const customerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: formatPeruvianPhone(phoneNumber),
      alternativePhone: alternativePhone
        ? formatPeruvianPhone(alternativePhone)
        : undefined,
      address: address.trim(),
      locationReference: locationReference?.trim(),
      customerType:
        customerType &&
        Object.values(CustomerTypeEnum).includes(customerType as any)
          ? customerType
          : CustomerTypeEnum.REGULAR,
      rating,
      isActive: true,
      totalOrders: 0,
    };

    const results = await db
      .insert(customers)
      .values(customerData as any)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating customer");
    }

    return this.mapToCustomer(results[0]);
  }

  async findById(customerId: number): Promise<Customer | null> {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.customerId, customerId),
    });

    if (!customer) return null;

    return this.mapToCustomer(customer);
  }

  async findByIdWithRelations(
    customerId: number,
    relations: CustomerRelationOptions = {}
  ): Promise<Customer | CustomerWithOrders | CustomerWithDebts> {
    const baseCustomer = await this.findById(customerId);
    if (!baseCustomer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    let result: any = { ...baseCustomer };

    if (relations.orders) {
      const customerOrders = await db.query.orders.findMany({
        where: eq(orders.customerId, customerId),
        orderBy: [desc(orders.createdAt)],
        columns: {
          orderId: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          totalAmount: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      });

      // Calculate totals
      const totalOrderValue = customerOrders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || "0"),
        0
      );
      const averageOrderValue =
        customerOrders.length > 0 ? totalOrderValue / customerOrders.length : 0;

      result = {
        ...result,
        orders: customerOrders.map((order) => ({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt?.toISOString() || new Date().toISOString(),
          status: order.status,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        })),
        totalOrderValue: totalOrderValue.toFixed(2),
        averageOrderValue: averageOrderValue.toFixed(2),
      } as CustomerWithOrders;
    }

    if (relations.debts) {
      const customerDebtsResult = await db.query.customerDebts.findMany({
        where: eq(customerDebts.customerId, customerId),
        orderBy: [desc(customerDebts.debtDate)],
      });

      const totalDebt = customerDebtsResult
        .filter((debt) => !debt.isPaid)
        .reduce((sum, debt) => sum + parseFloat(debt.amount), 0);

      const hasOverdueDebts = customerDebtsResult.some(
        (debt) =>
          !debt.isPaid && debt.dueDate && new Date(debt.dueDate) < new Date()
      );

      result = {
        ...result,
        debts: customerDebtsResult.map((debt) => ({
          debtId: debt.debtId,
          amount: debt.amount,
          description: debt.description,
          debtDate: debt.debtDate?.toISOString() || new Date().toISOString(),
          dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString() : null,
          isPaid: debt.isPaid,
        })),
        totalDebt: totalDebt.toFixed(2),
        hasOverdueDebts,
      } as CustomerWithDebts;
    }

    return result;
  }

  async update(
    customerId: number,
    updates: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      alternativePhone?: string;
      address?: string;
      locationReference?: string;
      customerType?: CustomerTypeEnum;
      rating?: number;
      isActive?: boolean;
    }
  ): Promise<Customer> {
    const current = await this.findById(customerId);
    if (!current) {
      throw new NotFoundError("Customer not found");
    }

    // Validate updates if needed
    if (
      updates.firstName ||
      updates.lastName ||
      updates.phoneNumber ||
      updates.address
    ) {
      const validation = await this.validateCustomerData(
        updates.firstName || current.firstName,
        updates.lastName || current.lastName,
        updates.phoneNumber || current.phoneNumber,
        updates.address || current.address,
        customerId // Exclude self from phone uniqueness check
      );

      if (!validation.valid) {
        throw new BadRequestError(
          `Invalid customer data: ${validation.errors.join(", ")}`
        );
      }
    }

    const updateData: Partial<NewCustomer> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (updates.firstName) updateData.firstName = updates.firstName.trim();
    if (updates.lastName) updateData.lastName = updates.lastName.trim();
    if (updates.phoneNumber)
      updateData.phoneNumber = formatPeruvianPhone(updates.phoneNumber);
    if (updates.alternativePhone)
      updateData.alternativePhone = formatPeruvianPhone(
        updates.alternativePhone
      );
    if (updates.address) updateData.address = updates.address.trim();
    if (updates.locationReference !== undefined)
      updateData.locationReference = updates.locationReference?.trim();
    if (updates.customerType) updateData.customerType = updates.customerType;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const results = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.customerId, customerId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating customer");
    }

    return this.mapToCustomer(results[0]);
  }

  async delete(customerId: number): Promise<void> {
    const result = await db
      .delete(customers)
      .where(eq(customers.customerId, customerId));

    if (result.rowCount === 0) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }
  }

  async findByPhone(phone: string): Promise<CustomerSearchResult | null> {
    const formattedPhone = formatPeruvianPhone(phone);

    const customer = await db.query.customers.findFirst({
      where: eq(customers.phoneNumber, formattedPhone),
    });

    if (!customer) {
      return null;
    }

    return this.mapToCustomerSearchResult(customer);
  }

  async searchByName(name: string): Promise<CustomerSearchResult[]> {
    const searchTerm = `%${name.trim()}%`;

    const results = await db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.firstName, searchTerm),
          ilike(customers.lastName, searchTerm),
          ilike(
            sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
            searchTerm
          )
        )
      )
      .limit(10);

    return results.map((customer) => this.mapToCustomerSearchResult(customer));
  }

  async findByPhoneOrCreate(
    customerData: QuickCustomerCreation
  ): Promise<CustomerForOrder> {
    // First try to find existing customer
    const existingCustomer = await this.findByPhone(customerData.customerPhone);

    if (existingCustomer) {
      return {
        customerId: existingCustomer.customerId,
        firstName: existingCustomer.firstName,
        lastName: existingCustomer.lastName,
        phoneNumber: existingCustomer.phoneNumber,
        address: existingCustomer.address,
        locationReference: existingCustomer.locationReference,
        preferredPaymentMethod: existingCustomer.preferredPaymentMethod,
      };
    }

    // Parse full name into first and last name
    const { firstName, lastName } = this.parseFullName(
      customerData.customerName
    );

    // Create new customer
    const newCustomer = await this.create(
      firstName,
      lastName,
      customerData.customerPhone,
      customerData.deliveryAddress,
      undefined,
      customerData.locationReference
    );

    return {
      customerId: newCustomer.customerId,
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      phoneNumber: newCustomer.phoneNumber,
      address: newCustomer.address,
      locationReference: newCustomer.locationReference,
      preferredPaymentMethod: newCustomer.preferredPaymentMethod,
    };
  }

  async findWithOrderHistory(customerId: number): Promise<CustomerWithOrders> {
    return (await this.findByIdWithRelations(customerId, {
      orders: true,
    })) as CustomerWithOrders;
  }

  async findWithDebts(customerId: number): Promise<CustomerWithDebts> {
    return (await this.findByIdWithRelations(customerId, {
      debts: true,
    })) as CustomerWithDebts;
  }

  async getCustomerAnalytics(customerId: number): Promise<CustomerAnalytics> {
    const customer = await this.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    // Get order analytics from the existing method
    const orderAnalytics = await db
      .select({
        totalOrders: count(orders.orderId),
        totalOrderValue: sum(orders.totalAmount),
        averageOrderValue: avg(orders.totalAmount),
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    const metrics = orderAnalytics[0];

    // Calculate days since last order
    let daysSinceLastOrder: number | null = null;
    if (customer.lastOrderDate) {
      const now = new Date();
      const lastOrder = new Date(customer.lastOrderDate);
      daysSinceLastOrder = Math.floor(
        (now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate order frequency (based on total orders and account age)
    let orderFrequency: "high" | "medium" | "low" = "low";
    const totalOrders = metrics.totalOrders || 0;

    if (totalOrders >= 20) {
      orderFrequency = "high";
    } else if (totalOrders >= 5) {
      orderFrequency = "medium";
    }

    // Calculate risk level (simplified - based on debts)
    const debts = await db.query.customerDebts.findMany({
      where: and(
        eq(customerDebts.customerId, customerId),
        eq(customerDebts.isPaid, false)
      ),
    });

    let riskLevel: "low" | "medium" | "high" = "low";
    const totalUnpaidDebt = debts.reduce(
      (sum, debt) => sum + parseFloat(debt.amount),
      0
    );

    if (totalUnpaidDebt > 1000) {
      riskLevel = "high";
    } else if (totalUnpaidDebt > 200) {
      riskLevel = "medium";
    }

    return {
      customerId: customer.customerId,
      fullName: this.formatFullName(customer.firstName, customer.lastName),
      customerType: customer.customerType,
      totalOrders: totalOrders,
      totalOrderValue: metrics.totalOrderValue || "0.00",
      averageOrderValue: metrics.averageOrderValue || "0.00",
      lastOrderDate: customer.lastOrderDate?.toISOString() || null,
      daysSinceLastOrder,
      orderFrequency,
      preferredPaymentMethod: customer.preferredPaymentMethod,
      rating: customer.rating,
      riskLevel,
    };
  }

  async updateLastOrderDate(
    customerId: number,
    orderDate: Date
  ): Promise<void> {
    await db
      .update(customers)
      .set({
        lastOrderDate: orderDate,
        updatedAt: new Date(),
      })
      .where(eq(customers.customerId, customerId));
  }

  async incrementOrderCount(customerId: number): Promise<void> {
    await db
      .update(customers)
      .set({
        totalOrders: sql`${customers.totalOrders} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customers.customerId, customerId));
  }

  async updatePreferredPayment(
    customerId: number,
    paymentMethod: string
  ): Promise<void> {
    await db
      .update(customers)
      .set({
        preferredPaymentMethod: paymentMethod,
        updatedAt: new Date(),
      })
      .where(eq(customers.customerId, customerId));
  }

  // Transaction-aware operations
  async createWithTransaction(
    trx: DbTransaction,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    alternativePhone?: string,
    locationReference?: string,
    customerType?: string,
    rating?: number
  ): Promise<Customer> {
    const customerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: formatPeruvianPhone(phoneNumber),
      alternativePhone: alternativePhone
        ? formatPeruvianPhone(alternativePhone)
        : undefined,
      address: address.trim(),
      locationReference: locationReference?.trim(),
      customerType:
        customerType &&
        Object.values(CustomerTypeEnum).includes(customerType as any)
          ? customerType
          : CustomerTypeEnum.REGULAR,
      rating,
      isActive: true,
      totalOrders: 0,
    };

    const results = await trx
      .insert(customers)
      .values(customerData as any)
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error creating customer");
    }

    return this.mapToCustomer(results[0]);
  }

  async updateWithTransaction(
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
  ): Promise<Customer> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.firstName) updateData.firstName = updates.firstName.trim();
    if (updates.lastName) updateData.lastName = updates.lastName.trim();
    if (updates.phoneNumber)
      updateData.phoneNumber = formatPeruvianPhone(updates.phoneNumber);
    if (updates.alternativePhone)
      updateData.alternativePhone = formatPeruvianPhone(
        updates.alternativePhone
      );
    if (updates.address) updateData.address = updates.address.trim();
    if (updates.locationReference !== undefined)
      updateData.locationReference = updates.locationReference?.trim();
    if (updates.customerType) updateData.customerType = updates.customerType;
    if (updates.rating !== undefined) updateData.rating = updates.rating;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    const results = await trx
      .update(customers)
      .set(updateData)
      .where(eq(customers.customerId, customerId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error updating customer");
    }

    return this.mapToCustomer(results[0]);
  }

  async updateLastOrderDateWithTransaction(
    trx: DbTransaction,
    customerId: number,
    orderDate: Date
  ): Promise<void> {
    await trx
      .update(customers)
      .set({
        lastOrderDate: orderDate,
        updatedAt: new Date(),
      })
      .where(eq(customers.customerId, customerId));
  }

  async incrementOrderCountWithTransaction(
    trx: DbTransaction,
    customerId: number
  ): Promise<void> {
    await trx
      .update(customers)
      .set({
        totalOrders: sql`${customers.totalOrders} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customers.customerId, customerId));
  }

  // Search and filtering operations
  async findActiveCustomers(limit: number = 50): Promise<Customer[]> {
    const results = await db
      .select()
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(desc(customers.lastOrderDate))
      .limit(limit);

    return results.map((customer) => this.mapToCustomer(customer));
  }

  async findInactiveCustomers(limit: number = 50): Promise<Customer[]> {
    const results = await db
      .select()
      .from(customers)
      .where(eq(customers.isActive, false))
      .orderBy(desc(customers.updatedAt))
      .limit(limit);

    return results.map((customer) => this.mapToCustomer(customer));
  }

  async findCustomersByType(customerType: string): Promise<Customer[]> {
    // Validate customerType is a valid enum value
    if (
      !Object.values(CustomerTypeEnum).includes(
        customerType as CustomerTypeEnum
      )
    ) {
      return [];
    }

    const results = await db
      .select()
      .from(customers)
      .where(eq(customers.customerType, customerType as CustomerTypeEnum))
      .orderBy(desc(customers.totalOrders));

    return results.map((customer) => this.mapToCustomer(customer));
  }

  async findCustomersWithHighRating(
    minRating: number = 4
  ): Promise<Customer[]> {
    const results = await db
      .select()
      .from(customers)
      .where(gte(customers.rating, minRating || 4))
      .orderBy(desc(customers.rating));

    return results.map((customer) => this.mapToCustomer(customer));
  }

  async findRecentCustomers(days: number = 30): Promise<Customer[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await db
      .select()
      .from(customers)
      .where(gte(customers.createdAt, cutoffDate))
      .orderBy(desc(customers.createdAt));

    return results.map((customer) => this.mapToCustomer(customer));
  }

  // Customer metrics and analytics
  async getCustomerCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(customers);
    return result.count;
  }

  async getCustomerMetrics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    averageRating: number;
    customersByType: Record<string, number>;
    newCustomersThisMonth: number;
  }> {
    // Get basic counts
    const [totalCustomersResult] = await db
      .select({ count: count() })
      .from(customers);
    const [activeCustomersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.isActive, true));
    const [inactiveCustomersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.isActive, false));

    // Get average rating
    const [avgRatingResult] = await db
      .select({ avgRating: avg(customers.rating) })
      .from(customers)
      .where(sql`${customers.rating} IS NOT NULL`);

    // Get customers by type
    const customersByTypeResult = await db
      .select({
        customerType: customers.customerType,
        count: count(),
      })
      .from(customers)
      .groupBy(customers.customerType);

    const customersByType = customersByTypeResult.reduce((acc, item) => {
      if (item.customerType) {
        acc[item.customerType] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get new customers this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const [newCustomersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(gte(customers.createdAt, firstDayOfMonth));

    return {
      totalCustomers: totalCustomersResult.count,
      activeCustomers: activeCustomersResult.count,
      inactiveCustomers: inactiveCustomersResult.count,
      averageRating: parseFloat(avgRatingResult.avgRating || "0"),
      customersByType,
      newCustomersThisMonth: newCustomersResult.count,
    };
  }

  async getTopCustomers(
    limit: number = 10,
    sortBy: "orders" | "revenue" | "rating" = "orders"
  ): Promise<
    Array<{
      customerId: number;
      fullName: string;
      phoneNumber: string;
      totalOrders: number;
      totalRevenue: string;
      averageOrderValue: string;
      rating?: number | null;
    }>
  > {
    // This would be more complex with actual revenue calculation
    // For now, using totalOrders from customer table as a proxy
    let orderBy;

    switch (sortBy) {
      case "rating":
        orderBy = desc(customers.rating);
        break;
      case "revenue":
      case "orders":
      default:
        orderBy = desc(customers.totalOrders);
        break;
    }

    const results = await db
      .select({
        customerId: customers.customerId,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phoneNumber: customers.phoneNumber,
        totalOrders: customers.totalOrders,
        rating: customers.rating,
      })
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(orderBy)
      .limit(limit);

    // For a complete implementation, you'd join with orders to get actual revenue
    // This simplified version assumes totalOrders * average order value
    return results.map((customer) => ({
      customerId: customer.customerId,
      fullName: this.formatFullName(customer.firstName, customer.lastName),
      phoneNumber: customer.phoneNumber,
      totalOrders: customer.totalOrders || 0,
      totalRevenue: "0.00", // Would calculate from actual orders
      averageOrderValue: "0.00", // Would calculate from actual orders
      rating: customer.rating,
    }));
  }

  // Validation and utility methods
  async validateCustomerData(
    firstName: string,
    lastName: string,
    phoneNumber: string,
    address: string,
    customerId?: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate required fields
    if (!firstName.trim()) {
      errors.push("First name is required");
    }
    if (!lastName.trim()) {
      errors.push("Last name is required");
    }
    if (!phoneNumber.trim()) {
      errors.push("Phone number is required");
    }
    if (!address.trim()) {
      errors.push("Address is required");
    }

    // Validate phone number uniqueness
    if (phoneNumber.trim()) {
      const isPhoneTaken = await this.isPhoneNumberTaken(
        phoneNumber,
        customerId
      );
      if (isPhoneTaken) {
        errors.push("Phone number is already registered");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async isPhoneNumberTaken(
    phoneNumber: string,
    excludeCustomerId?: number
  ): Promise<boolean> {
    const formattedPhone = formatPeruvianPhone(phoneNumber);

    const whereConditions = [eq(customers.phoneNumber, formattedPhone)];

    if (excludeCustomerId) {
      whereConditions.push(
        sql`${customers.customerId} != ${excludeCustomerId}`
      );
    }

    const existing = await db
      .select({ customerId: customers.customerId })
      .from(customers)
      .where(and(...whereConditions))
      .limit(1);

    return existing.length > 0;
  }

  async searchCustomers(
    query: string,
    limit: number = 10
  ): Promise<CustomerSearchResult[]> {
    const searchTerm = `%${query.trim()}%`;

    const results = await db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.firstName, searchTerm),
          ilike(customers.lastName, searchTerm),
          ilike(
            sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
            searchTerm
          ),
          ilike(customers.phoneNumber, searchTerm),
          ilike(customers.address, searchTerm)
        )
      )
      .limit(limit);

    return results.map((customer) => this.mapToCustomerSearchResult(customer));
  }

  formatFullName(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`;
  }

  parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(" ");

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }

    if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] };
    }

    // For more than 2 parts, take first as firstName, rest as lastName
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");

    return { firstName, lastName };
  }
}
