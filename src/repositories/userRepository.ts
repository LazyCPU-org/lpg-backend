import { User } from "../interfaces/models/userInterface";
import { db } from "../db";
import { users } from "../db/schemas/user-management";
import { eq } from "drizzle-orm";

export interface UserRepository {
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
}

export class PgUserRepository implements UserRepository {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async getUserById(id: number): Promise<User | null> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.userId, id) && eq(users.isActive, true));

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  }
}
