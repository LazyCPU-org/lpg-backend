import { SeedModule } from "../types";
import { inventoryItem } from "../../schemas/inventory";
import type { DrizzleDB } from "../types";

const run = async (db: DrizzleDB): Promise<void> => {
  // Check if any inventory items already exist
  const existingItems = await db.select().from(inventoryItem).limit(1);

  if (existingItems.length > 0) {
    console.log(`Inventory items already exist. Skipping seed.`);
    return;
  }

  console.log(`Seeding inventory items...`);

  const items = [
    {
      name: "Regulador estándar",
      description: "Regulador de presión para cocina doméstica",
      currentPrice: "24.99",
    },
    {
      name: "Cooking Spatula",
      description: "High-quality silicone spatula",
      currentPrice: "12.50",
    },
    {
      name: "Gas Regulator",
      description: "Standard gas regulator for home use",
      currentPrice: "35.00",
    },
  ];

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.insert(inventoryItem).values(item);
    }
    console.log(`${items.length} inventory items created successfully`);
  });
};

const inventorySeed: SeedModule = {
  name: "inventory",
  description: "Seeds initial inventory items",
  dependencies: ["core_users"], // Depends on users being created first
  run,
};

export default inventorySeed;
