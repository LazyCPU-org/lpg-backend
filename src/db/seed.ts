import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../db/schemas";
import { credentials } from "../config/db-credentials";
import { loadEnvironmentConfig } from "../utils/config";
import seedModules from "./seeds/modules";
import { SeedManager } from "./seeds/manager";

// Load environment configuration
loadEnvironmentConfig();

// Determine environment and log it
const env = process.env.ENV || "local";
console.log(`🌱 Seeding database for ${env} environment`);

// Check if seeding is explicitly enabled via environment variable
const SEEDING_ENABLED = process.env.ENABLE_DATA_SEED === "true";

if (!SEEDING_ENABLED) {
  console.log(
    "⚠️ Data seeding is disabled. Set ENABLE_DATA_SEED=true to enable."
  );
  process.exit(0);
}

async function runSeeder() {
  let client;
  try {
    // Use the existing connection logic
    const ENGINE = "postgres";
    const connectionCreds = credentials[ENGINE];

    console.log(`🔌 Connecting to database using project credentials...`);

    // Create a client
    client = new pg.Client(connectionCreds);

    // Connect to database
    await client.connect();
    console.log("✅ Connected to database successfully");

    // Create drizzle instance with schema
    const db = drizzle(client, { schema });

    // Create seed manager with modules
    const seedManager = new SeedManager(db, seedModules);

    // Run all seed modules
    await seedManager.runInOrder();
  } catch (error) {
    console.error("❌ Seeding process failed:", error);
    process.exit(1);
  } finally {
    // Close client connection
    if (client) {
      await client.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the seeder
runSeeder()
  .then(() => {
    console.log("✅ Seeding process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding process failed:", error);
    process.exit(1);
  });
