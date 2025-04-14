import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcrypt";
import * as schema from "../db/schemas";
import { credentials } from "../config/db-credentials";
import { users, superadmins } from "./schemas/user-management";
import { UserRoleEnum } from "../config/roles";
import { loadEnvironmentConfig } from "../utils/config";
import { eq } from "drizzle-orm";

// Load environment configuration
loadEnvironmentConfig();

// Determine environment and log it
const env = process.env.ENV || "local";
console.log(`Seeding database for ${env} environment`);

// Validate required environment variables
const requiredEnvVars = ["SUPERADMIN_EMAIL", "SUPERADMIN_PASSWORD"];

let missingVars = false;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable ${envVar} is not set`);
    missingVars = true;
  }
}

if (missingVars) {
  process.exit(1);
}

// Check if seeding is explicitly enabled via environment variable
const SEEDING_ENABLED = process.env.ENABLE_DATA_SEED === "true";

if (!SEEDING_ENABLED) {
  console.log("Data seeding is disabled. Set ENABLE_DATA_SEED=true to enable.");
  process.exit(0);
}

async function seedSuperadmin() {
  // Use the existing connection logic
  const ENGINE = "postgres";
  const connectionCreds = credentials[ENGINE];

  console.log(`Connecting to database using project credentials...`);

  // Create a client
  const client = new pg.Client(connectionCreds);

  try {
    // Connect to database
    await client.connect();
    console.log("Connected to database successfully");

    // Create drizzle instance with schema
    const db = drizzle(client, { schema });

    // Check if superadmin already exists
    const existingSuperadmin = await db
      .select()
      .from(users)
      .where(eq(users.role, UserRoleEnum.SUPERADMIN))
      .limit(1);

    if (existingSuperadmin.length > 0) {
      console.log(
        `Superadmin already exists (${existingSuperadmin[0].email}). Skipping seed.`
      );
      return;
    }

    // Hash password with high security for superadmin
    const passwordHash = await bcrypt.hash(
      process.env.SUPERADMIN_PASSWORD!,
      14
    );

    console.log(
      `Creating superadmin with email: ${process.env.SUPERADMIN_EMAIL}`
    );

    await db.transaction(async (tx) => {
      try {
        // Insert user
        const userResult = await tx
          .insert(users)
          .values({
            email: process.env.SUPERADMIN_EMAIL!,
            passwordHash,
            role: UserRoleEnum.SUPERADMIN,
            isActive: true,
          })
          .returning();

        const newUser = userResult[0];

        // Insert superadmin
        await tx.insert(superadmins).values({
          userId: newUser.userId,
          accessLevel: "all",
          canManageUsers: true,
          canManageFinances: true,
          canManageTransactions: true,
        });

        console.log(
          `Superadmin created successfully with ID: ${newUser.userId}`
        );
      } catch (error) {
        // Rollback transaction on error
        tx.rollback();
      }
    });
  } catch (error) {
    console.error("Error seeding superadmin:", error);
    process.exit(1);
  } finally {
    // Close client connection
    await client.end();
    console.log("Database connection closed");
  }
}

// Run the seeder
seedSuperadmin()
  .then(() => {
    console.log("Seeding process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding process failed:", error);
    process.exit(1);
  });
