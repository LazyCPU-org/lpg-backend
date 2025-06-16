import { desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { orders } from "../../db/schemas/orders";

export class OrderUtils {
  static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();

    // Get the latest order number for this year
    const latestOrder = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(sql`${orders.orderNumber} LIKE ${`ORD-${year}-%`}`)
      .orderBy(desc(orders.orderNumber))
      .limit(1);

    let nextSequence = 1;

    if (latestOrder.length > 0) {
      const match = latestOrder[0].orderNumber.match(/ORD-\d{4}-(\d{3})/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    return `ORD-${year}-${nextSequence.toString().padStart(3, "0")}`;
  }

  static calculateOrderTotal(
    orderItems: { quantity: number; unitPrice: string }[]
  ): string {
    const total = orderItems.reduce((sum, item) => {
      const itemTotal = item.quantity * parseFloat(item.unitPrice);
      return sum + itemTotal;
    }, 0);

    return total.toFixed(2);
  }
}