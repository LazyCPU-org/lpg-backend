import { Auth } from "../interfaces/models/authInterface";
import { db } from "../db";
import { superadmins, users, admins } from "../db/schemas/user-management";
import { eq } from "drizzle-orm";
import { RegisterRequest } from "../dtos/authDTO";
import { SudoAdmin, User } from "../interfaces/models/userInterface";
import { UserRoleEnum } from "../config/roles";
import { PermissionSets } from "../utils/permissions";

export interface AuthRepository {
  registerByRole(
    registerRequest: RegisterRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth>;
  findUserByRole(
    email: string,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<User | null>;
  findSudoAdminByUserId(id: number): Promise<SudoAdmin | null>;
  superadminExists(): Promise<boolean>;
  findAdminByUserId(id: number): Promise<any | null>;
  updateSudoAdminPermissions(
    userId: number,
    permissions: string[]
  ): Promise<void>;
  updateAdminPermissions(userId: number, permissions: string[]): Promise<void>;

  // Method for creating admin entries
  createAdmin(adminData: {
    userId: number;
    permissions?: string[];
    // Add any other required fields
  }): Promise<any>;
}

export class PgAuthRepository implements AuthRepository {
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

  async findSudoAdminByUserId(id: number): Promise<SudoAdmin | null> {
    const results = await db
      .select()
      .from(superadmins)
      .where(eq(superadmins.userId, id));

    const row = results[0];

    if (!row || results.length > 1) {
      return null;
    }

    return row;
  }
  async superadminExists(): Promise<boolean> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.role, UserRoleEnum.SUPERADMIN));

    return rows.length > 0;
  }

  async findAdminByUserId(id: number): Promise<any | null> {
    // Implementation depends on your schema
    const results = await db.select().from(admins).where(eq(admins.userId, id));

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  }

  async updateSudoAdminPermissions(
    userId: number,
    permissions: string[]
  ): Promise<void> {
    await db
      .update(superadmins)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(superadmins.userId, userId));
  }

  async updateAdminPermissions(
    userId: number,
    permissions: string[]
  ): Promise<void> {
    await db
      .update(admins)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(admins.userId, userId));
  }

  async createAdmin(adminData: {
    userId: number;
    permissions?: string[];
  }): Promise<any> {
    const result = await db
      .insert(admins)
      .values({
        userId: adminData.userId,
        permissions: adminData.permissions || PermissionSets.ADMIN_PERMISSIONS,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        adminId: admins.adminId,
        userId: admins.userId,
        permissions: admins.permissions,
      });

    return result[0];
  }
}
