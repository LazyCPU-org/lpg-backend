import * as dotenv from "dotenv";
dotenv.config();

export const credentials = {
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "lpg",
  },
};
