import { OrderStatusEnum } from "../../db/schemas/orders";

export type TimelineItem = {
  status: OrderStatusEnum;
  timestamp: Date;
  duration?: number;
  changedBy: number;
  changedByName?: string;
  reason: string;
  notes?: string;
};
