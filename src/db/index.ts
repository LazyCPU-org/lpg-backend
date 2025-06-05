import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { credentials } from "../config/db-credentials";
import * as schema from "../db/schemas/index";

const ENGINE = "postgres";
const connectionCreds = credentials[ENGINE];

const client = new pg.Client(connectionCreds);

client.connect();

export const db = drizzle(client, { schema });
