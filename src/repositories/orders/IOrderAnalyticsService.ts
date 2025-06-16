export abstract class IOrderAnalyticsService {
  // Business intelligence and analytics
  abstract getOrderMetrics(
    storeId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalOrders: number;
    totalRevenue: string;
    averageOrderValue: string;
    ordersByStatus: Record<string, number>;
  }>;

  // Customer analytics support
  abstract getCustomerOrderAnalytics(customerId: number): Promise<{
    totalOrders: number;
    totalSpent: string;
    averageOrderValue: string;
    lastOrderDate: Date | null;
    preferredPaymentMethod: string | null;
    orderFrequency: "high" | "medium" | "low";
  }>;
}
