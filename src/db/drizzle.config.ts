import { defineConfig } from "drizzle-kit";
import { loadEnvironmentConfig } from "../utils/config";
// Load environment variables
loadEnvironmentConfig();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schemas/index.ts",
  out: "./src/db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
