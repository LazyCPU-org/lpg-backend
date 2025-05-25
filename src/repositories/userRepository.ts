import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schemas/user-management";
import {
  SafeUser,
  SafeUserWithRelations,
  selectSafeUserSchema,
  selectSafeUserWithRelationsSchema,
} from "../dtos/response/userInterface";
import { NotFoundError } from "../utils/custom-errors";
import { UserStatus } from "../utils/status";

export interface UserRepository {
  getUsers(): Promise<SafeUserWithRelations[]>;
  getUserById(id: number): Promise<SafeUser>;
}

export class PgUserRepository implements UserRepository {
  async getUsers(): Promise<SafeUserWithRelations[]> {
    const results = await db.query.users.findMany({
      where: eq(users.status, UserStatus.ACTIVE),
      with: {
        userProfile: true,
      },
    });

    return results.map((user) => selectSafeUserWithRelationsSchema.parse(user));
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
