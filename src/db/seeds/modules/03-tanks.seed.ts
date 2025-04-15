import { SeedModule } from "../types";
import { tankType } from "../../schemas/inventory";
import type { DrizzleDB } from "../types";

const run = async (db: DrizzleDB): Promise<void> => {
  // Check if any tank types already exist
  const existingTankTypes = await db.select().from(tankType).limit(1);

  if (existingTankTypes.length > 0) {
    console.log(`Tank types already exist. Skipping seed.`);
    return;
  }

  console.log(`Seeding tank types...`);

  const tanks = [
    {
      name: "Standard 5kg",
      weight: "5.00",
      description: "Standard 5kg propane tank for home use",
      currentPrice: "45.00",
    },
    {
      name: "Industrial 10kg",
      weight: "10.00",
      description: "Industrial grade 10kg propane tank",
      currentPrice: "75.00",
    },
    {
      name: "Compact 3kg",
      weight: "3.00",
      description: "Compact 3kg tank for camping and portable use",
      currentPrice: "30.00",
    },
  ];

  await db.transaction(async (tx) => {
    for (const tank of tanks) {
      await tx.insert(tankType).values(tank);
    }
    console.log(`${tanks.length} tank types created successfully`);
  });
};

const tanksSeed: SeedModule = {
  name: "tanks",
  description: "Seeds initial tank types",
  dependencies: ["inventory"], // Depends on inventory items being created first
  run,
};

export default tanksSeed;
