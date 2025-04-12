import { Auth } from "../interfaces/authInterface";
import { db } from "../db";
import { users } from "../db/schemas/user-management";
import { eq } from "drizzle-orm";
import { RegisterRequest } from "../dtos/authDTO";
import { User } from "../interfaces/userInterface";
import { UserRoleEnum } from "../config/roles";

export interface AuthRepository {
  registerByRole(
    registerRequest: RegisterRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth>;
  findUserByRole(
    email: string,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<User | null>;
  superadminExists(): Promise<boolean>;
}

export class PgAuthRepository implements AuthRepository {
  async superadminExists(): Promise<boolean> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.role, UserRoleEnum.SUPERADMIN));

    return rows.length > 0;
  }

  async findUserByRole(
    email: string,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<User | null> {
    const rows = await db
      .select()
      .from(users)
      .where(
        eq(users.email, email) &&
          eq(users.role, role) &&
          eq(users.isActive, true)
      );
    const row = rows[0];

    if (!row || rows.length > 1) {
      return null;
    }

    return row;
  }

  async registerByRole(
    registerRequest: RegisterRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth> {
    const newUser = await db
      .insert(users)
      .values({
        email: registerRequest.email,
        passwordHash: registerRequest.password,
        role: role,
      })
      .returning({
        id: users.userId,
        email: users.email,
        user_role: users.role as any,
      });
    return newUser[0];
  }
}
