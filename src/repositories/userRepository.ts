import { SafeUser, selectSafeUserSchema } from "../dtos/response/userInterface";
import { db } from "../db";
import { users } from "../db/schemas/user-management";
import { and, eq } from "drizzle-orm";
import { UserStatus } from "../utils/status";
import { NotFoundError } from "../utils/custom-errors";

export interface UserRepository {
  getUsers(): Promise<SafeUser[]>;
  getUserById(id: number): Promise<SafeUser>;
}

export class PgUserRepository implements UserRepository {
  async getUsers(): Promise<SafeUser[]> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.status, UserStatus.ACTIVE))
      .orderBy(users.userId);

    return results.map((user) => selectSafeUserSchema.parse(user));
  }

  async getUserById(id: number): Promise<SafeUser> {
    const results = await db
      .select()
      .from(users)
      .where(and(eq(users.userId, id), eq(users.status, UserStatus.ACTIVE)));

    if (!results || results.length === 0) {
      throw new NotFoundError("Usuario inválido");
    }

    const user = results[0];
    return selectSafeUserSchema.parse(user);
  }
}
