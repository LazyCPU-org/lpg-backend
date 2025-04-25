import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

// Define the sudo-admins table
export const superadmins = pgTable("superadmins", {
  sudoadminId: serial("sudoadmin_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.userId)
    .unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export default superadmins;
