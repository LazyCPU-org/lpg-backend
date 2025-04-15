import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const seedTracker = pgTable("seed_tracker", {
  module: varchar("module", { length: 100 }).primaryKey(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  version: varchar("version", { length: 50 }).notNull(),
});

export const insertSeedTrackerSchema = createInsertSchema(seedTracker);
export const selectSeedTrackerSchema = createSelectSchema(seedTracker);

export type SeedTracker = z.infer<typeof selectSeedTrackerSchema>;
export type NewSeedTracker = z.infer<typeof insertSeedTrackerSchema>;

export default seedTracker;
