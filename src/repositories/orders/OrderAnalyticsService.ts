import { and, avg, count, desc, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "../../db";
import { orders } from "../../db/schemas/orders";
import { IOrderAnalyticsService } from "./IOrderAnalyticsService";
import { IOrderQueryService } from "./IOrderQueryService";

export class OrderAnalyticsService implements IOrderAnalyticsService {
  constructor(private orderQueryService: IOrderQueryService) {}

  async getOrderMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersByStatus: Record<string, number>;
  }> {
    const whereConditions = [];

    if (storeId) {
      whereConditions.push(eq(orders.storeId, storeId));
    }

    if (dateRange) {
      whereConditions.push(gte(orders.createdAt, dateRange.from));
      whereConditions.push(lte(orders.createdAt, dateRange.to));
    }

    // Get basic metrics
    const [metrics] = await db
      .select({
        totalOrders: count(orders.orderId),
        totalRevenue: sum(orders.totalAmount),
        averageOrderValue: avg(orders.totalAmount),
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Get orders by status
    const statusCounts = await db
      .select({
        status: orders.status,
        count: count(orders.orderId),
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(orders.status);

    const ordersByStatus = statusCounts.reduce((acc, item) => {
      if (item.status) {
        acc[item.status] = item.count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders: metrics.totalOrders || 0,
      totalRevenue: metrics.totalRevenue || "0.00",
      averageOrderValue: metrics.averageOrderValue || "0.00",
      ordersByStatus,
    };
  }

  async getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }> {
    // Get basic customer order metrics
    const [metrics] = await db
      .select({
        totalOrders: count(orders.orderId),
        totalSpent: sum(orders.totalAmount),
        averageOrderValue: avg(orders.totalAmount),
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    // Get last order date
    const lastOrder = await this.orderQueryService.findCustomerLastOrder(customerId);

    // Get most used payment method
    const [paymentMethod] = await db
      .select({
        paymentMethod: orders.paymentMethod,
        count: count(orders.orderId),
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .groupBy(orders.paymentMethod)
      .orderBy(desc(count(orders.orderId)))
      .limit(1);

    // Calculate order frequency (simple heuristic based on total orders)
    const totalOrders = metrics.totalOrders || 0;
    let orderFrequency: "high" | "medium" | "low" = "low";

    if (totalOrders >= 20) {
      orderFrequency = "high";
    } else if (totalOrders >= 5) {
      orderFrequency = "medium";
    }

    return {
      totalOrders: totalOrders,
      totalSpent: metrics.totalSpent || "0.00",
      averageOrderValue: metrics.averageOrderValue || "0.00",
      lastOrderDate: lastOrder?.createdAt || null,
      preferredPaymentMethod: paymentMethod?.paymentMethod || null,
      orderFrequency,
    };
  }
}