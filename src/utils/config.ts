import dotenv from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Loads environment-specific configuration
 */
export function loadEnvironmentConfig() {
  // Determine environment
  const env = process.env.ENV || "local";

  // Try to load environment-specific .env file
  const envPath = path.resolve(process.cwd(), `src/docker/env/.env.${env}`);

  if (fs.existsSync(envPath)) {
    console.log(
      `Loading configuration for ${env} environment from: ${envPath}`
    );
    dotenv.config({ path: envPath });
  } else {
    // Fallback to default .env file in the root directory
    const rootEnvPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(rootEnvPath)) {
      console.log(
        `Environment file ${envPath} not found. Loading from .env file at root.`
      );
      dotenv.config();
    } else {
      console.log(
        `No environment file found. Using existing environment variables.`
      );
    }
  }

  // Return the loaded config for reference
  return {
    environment: env,
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5000", 10),
    databaseUrl: process.env.DATABASE_URL,
  };
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  return {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "lpg_db",
  };
}

/**
 * Get JWT configuration
 */
export function getJwtConfig() {
  return {
    secret: process.env.JWT_SECRET || "development-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  };
}

/**
 * Get server configuration
 */
export function getServerConfig() {
  return {
    port: parseInt(process.env.PORT || "5000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    environment: process.env.ENV || "local",
  };
}

/**
 * Validate environment variables
 * @param required List of required environment variables
 * @returns boolean indicating if all required variables are present
 */
export function validateEnv(required: string[]): boolean {
  let valid = true;

  for (const variable of required) {
    if (!process.env[variable]) {
      console.error(
        `Error: Required environment variable ${variable} is not set`
      );
      valid = false;
    }
  }

  return valid;
}
