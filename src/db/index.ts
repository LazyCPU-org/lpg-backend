import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../db/schemas";
import { credentials } from "../config/db-credentials";

const ENGINE = "postgres";
const connectionCreds = credentials[ENGINE];

const client = new pg.Client(connectionCreds);

client.connect();

export const db = drizzle(client, { schema });
