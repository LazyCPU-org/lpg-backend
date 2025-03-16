import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
const { Client } = pg;
import * as dotenv from "dotenv";
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || "",
});

await client.connect();

const db = drizzle(client);

await migrate(db, { migrationsFolder: "./src/db/drizzle" });

await client.end();

console.log("Migrations completed!");
