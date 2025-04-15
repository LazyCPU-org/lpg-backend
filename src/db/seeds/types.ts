import * as schema from "../schemas";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

export type DrizzleDB = NodePgDatabase<typeof schema>;

export interface SeedModule {
  name: string;
  description: string;
  dependencies?: string[];
  run: (db: DrizzleDB) => Promise<void>;
}
