import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { inventoryItem, tankType } from "../../db/schemas/inventory";

// Create Zod schemas for validation
export const insertTankTypeSchema = createInsertSchema(tankType);
export const selectTankTypeSchema = createSelectSchema(tankType);

export type TankType = z.infer<typeof selectTankTypeSchema>;
export type NewTankType = z.infer<typeof insertTankTypeSchema>;

export const insertInventoryItemSchema = createInsertSchema(inventoryItem);
export const selectInventoryItemSchema = createSelectSchema(inventoryItem);

export type InventoryItem = z.infer<typeof selectInventoryItemSchema>;
export type NewInventoryItem = z.infer<typeof insertInventoryItemSchema>;
