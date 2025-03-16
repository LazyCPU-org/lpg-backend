import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schemas/index.ts",
  out: "./src/db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
