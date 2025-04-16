import { SeedModule } from "../types";
import { inventoryItem, tankType } from "../../schemas/inventory";
import type { DrizzleDB } from "../types";

const run = async (db: DrizzleDB): Promise<void> => {
  // Check if any inventory items already exist
  const existingItems = await db.select().from(inventoryItem).limit(1);

  if (existingItems.length > 0) {
    console.log(`Inventory items already exist. Skipping seed.`);
    return;
  }

  console.log(`Seeding inventory items...`);

  const tanks = [
    {
      name: "GLP Premium",
      weight: "10kg",
      description:
        "Gas Licuado de Petróleo (GLP) de alta pureza, ideal para uso residencial y comercial. Mayor eficiencia energética y menor residuo de combustión.",
      purchase_price: "42.00",
      sell_price: "55.00",
    },
    {
      name: "GLP Regular",
      weight: "10kg",
      description:
        "GLP estándar para uso doméstico y pequeños negocios. Combustión confiable y rendimiento equilibrado a un precio accesible.",
      purchase_price: "41.00",
      sell_price: "54.00",
    },
    {
      name: "GLP Regular",
      weight: "5kg",
      description:
        "Versión compacta del GLP Regular, perfecta para hogares pequeños o uso temporal en camping y viajes.",
      purchase_price: "22.00",
      sell_price: "31.00",
    },
    {
      name: "GLP Regular",
      weight: "45kg",
      description:
        "Tanque industrial de GLP Regular para alto consumo. Ideal para restaurantes, talleres y aplicaciones que requieren gran autonomía.",
      purchase_price: "180.00",
      sell_price: "250.00",
    },
    {
      name: "Cilindro Premium",
      weight: "10kg",
      description:
        "Cilindro de acero reforzado para GLP Premium, con válvula de seguridad y diseño resistente a impactos. Garantiza máxima durabilidad.",
      purchase_price: "65.00",
      sell_price: "80.00",
    },
    {
      name: "Cilindro Regular",
      weight: "10kg",
      description:
        "Cilindro estándar para GLP, fabricado bajo normas de seguridad. Buen equilibrio entre precio y resistencia para uso frecuente.",
      purchase_price: "65.00",
      sell_price: "80.00",
    },
    {
      name: "Cilindro Regular",
      weight: "5kg",
      description:
        "Cilindro pequeño y portable, ideal para espacios reducidos o como reserva secundaria. Cumple con regulaciones de transporte seguro.",
      purchase_price: "60.00",
      sell_price: "70.00",
    },
    {
      name: "Cilindro Regular",
      weight: "45kg",
      description:
        "Cilindro industrial de gran capacidad, diseñado para uso intensivo en comercios y fábricas. Incluye sistema anti-fugas y base estable.",
      purchase_price: "210.00",
      sell_price: "260.00",
    },
  ];

  const items = [
    {
      name: "Válvula regular",
      description:
        "Válvula de uso general para sistemas de presión media, fabricada en aleación resistente a la corrosión.",
      scale: "unidad",
      purchase_price: "20.00",
      sell_price: "35.00",
    },
    {
      name: "Adaptador de presión alta",
      description:
        "Adaptador especializado para sistemas de alta presión, con sellado hermético y conexiones reforzadas.",
      scale: "unidad",
      purchase_price: "10.00",
      sell_price: "20.00",
    },
    {
      name: "Válvula premium PB",
      description:
        "Válvula de alta gama para presión baja, con diseño ergonómico y máxima durabilidad en condiciones exigentes.",
      scale: "unidad",
      purchase_price: "30.00",
      sell_price: "40.00",
    },
    {
      name: "Válvula premium PA",
      description:
        "Válvula premium para alta presión, fabricada con materiales de primera calidad y certificación industrial.",
      scale: "unidad",
      purchase_price: "20.00",
      sell_price: "40.00",
    },
    {
      name: "Manguera alta",
      description:
        "Manguera reforzada para aplicaciones de alta presión, flexible y resistente a abrasiones y condiciones climáticas adversas.",
      scale: "m",
      purchase_price: "4.00",
      sell_price: "8.00",
    },
    {
      name: "Manguera baja",
      description:
        "Manguera estándar para presión baja, ideal para usos generales con buena resistencia al desgaste y fácil instalación.",
      scale: "m",
      purchase_price: "3.00",
      sell_price: "6.00",
    },
  ];

  await db.transaction(async (tx) => {
    for (const itemSeed of items) {
      await tx.insert(inventoryItem).values(itemSeed);
    }
    for (const tankSeed of tanks) {
      await tx.insert(tankType).values(tankSeed);
    }
    console.log(`${tanks.length} tank types created successfully`);
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
