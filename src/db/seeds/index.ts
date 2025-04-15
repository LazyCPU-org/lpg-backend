import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../schemas";
import { credentials } from "../../config/db-credentials";
import seedModules from "./modules";
import { SeedManager } from "./manager";

// Define allowed engine types based on the credentials object keys
type EngineType = keyof typeof credentials;

export async function runSeeder(
  options: {
    engineType?: EngineType;
    connectionCreds?: pg.ClientConfig;
    logEnabled?: boolean;
  } = {}
) {
  const {
    engineType = "postgres",
    connectionCreds = credentials[engineType || "postgres"],
    logEnabled = true,
  } = options;

  let client;
  try {
    if (logEnabled) console.log(`🔌 Connecting to database...`);

    // Create a client
    client = new pg.Client(connectionCreds);

    // Connect to database
    await client.connect();
    if (logEnabled) console.log("✅ Connected to database successfully");

    // Create drizzle instance with schema
    const db = drizzle(client, { schema });

    // Create seed manager with modules
    const seedManager = new SeedManager(db, seedModules);

    // Validate dependency graph and run seeds in order
    try {
      await seedManager.runInOrder();
      if (logEnabled) console.log("✅ Seeding process completed successfully");
    } catch (error) {
      if (logEnabled) console.error("❌ Error in seed execution:", error);
      throw error;
    }
  } catch (error) {
    if (logEnabled) console.error("❌ Seeding process failed:", error);
    throw error;
  } finally {
    // Close client connection
    if (client) {
      await client.end();
      if (logEnabled) console.log("🔌 Database connection closed");
    }
  }
}
