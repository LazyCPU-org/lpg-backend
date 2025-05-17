import { SafeUser } from "../dtos/response/userInterface";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Auth, PreRegistration } from "../dtos/response/authInterface";
import { db } from "../db";
import {
  superadmins,
  users,
  preRegistration,
  userProfiles,
  admins,
  operators,
  deliveryPersonnel,
} from "../db/schemas/user-management";
import { and, eq, isNull } from "drizzle-orm";
import { RegisterRequest, RegisterUserRequest } from "../dtos/request/authDTO";
import { SudoAdmin, User } from "../dtos/response/userInterface";
import { UserRoleEnum } from "../config/roles";
import { UserStatus } from "../utils/status";
import {
  BadRequestError,
  ExpirationError,
  NotFoundError,
} from "../utils/custom-errors";

export interface AuthRepository {
  /* Register methods */

  // Creates a registration token, needed for first step of Register process
  createRegistrationToken(userData: {
    email: string;
    name: string;
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
    createdBy: number;
    expiresInHours?: number;
  }): Promise<PreRegistration>;

  // Retrieves data based on a registration token provided in first step
  getTokenData(token: string): Promise<PreRegistration>;

  // Completes the register process
  completeTokenRegistration(
    token: string,
    preRegistrationData: PreRegistration,
    registerRequest: RegisterRequest,
    permissionList: string[]
  ): Promise<Auth>;

  registerByRole(
    registerRequest: RegisterUserRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth>;

  // Validation for superadmin user creation
  superadminExists(): Promise<boolean>;

  // Register user in it's correpondant role table
  createSuperadminByUser(user: SafeUser): Promise<boolean>;
  createAdminByUser(user: SafeUser): Promise<boolean>;
  createOperatorByUser(user: SafeUser): Promise<boolean>;
  createDeliveryByUser(user: SafeUser): Promise<boolean>;

  /* Login methods */
  // Method to update the latest login date
  updateLastLogin(id: number): Promise<boolean | null>;
  findUserByRole(
    email: string,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<User | null>;
  findUserById(id: number): Promise<User>;
  findUserByEmail(email: string): Promise<User>;
  findSudoAdminByUserId(id: number): Promise<SudoAdmin | null>;

  /* Method to find user on role-specific tables */
  findRoleByUserId(id: number): Promise<any | null>;

  /* Authorization methods */
  updateUserPermissions(userId: number, permissions: string[]): Promise<void>;
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
          eq(users.status, UserStatus.ACTIVE)
      );
    const row = rows[0];

    if (!row || rows.length > 1) {
      return null;
    }

    return row;
  }

  async findUserById(id: number): Promise<User> {
    const rows = await db.select().from(users).where(eq(users.userId, id));
    const row = rows[0];

    if (!row || rows.length > 1) {
      throw new BadRequestError();
    }

    return row;
  }

  async findUserByEmail(email: string): Promise<User> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const result = results[0];
    if (!result || results.length > 1) {
      throw new NotFoundError("Usuario no registrado");
    }
    return result;
  }

  async registerByRole(
    registerUserRequest: RegisterUserRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth> {
    const newUser = await db
      .insert(users)
      .values({
        email: registerUserRequest.email,
        passwordHash: registerUserRequest.password,
        name: registerUserRequest.name,
        role: role,
      })
      .returning({
        id: users.userId,
        name: users.name,
        email: users.email,
        user_role: users.role as any,
        permissions: users.permissions,
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
  // Will create the respective data in the table associated with the user's current role
  async createSuperadminByUser(user: SafeUser): Promise<boolean> {
    return false; // Operation not allowed
  }
  async createAdminByUser(user: SafeUser): Promise<boolean> {
    const response = await db.insert(admins).values({ userId: user.userId });
    return !!response;
  }
  async createOperatorByUser(user: SafeUser): Promise<boolean> {
    const response = await db.insert(operators).values({ userId: user.userId });
    return !!response;
  }
  async createDeliveryByUser(user: SafeUser): Promise<boolean> {
    const response = await db
      .insert(deliveryPersonnel)
      .values({ userId: user.userId });
    return !!response;
  }

  // Will retrieve the respective table associated with the user's current role
  async findRoleByUserId(id: number): Promise<any | null> {}

  async updateUserPermissions(
    userId: number,
    permissions: string[]
  ): Promise<void> {
    await db
      .update(users)
      .set({
        permissions,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, userId));
  }

  async updateLastLogin(id: number): Promise<boolean | null> {
    const loginUpdate = await db
      .update(users)
      .set({
        lastLogin: new Date(),
      })
      .where(eq(users.userId, id));

    return loginUpdate != null;
  }

  async createRegistrationToken(userData: {
    email: string;
    name: string;
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
    createdBy: number;
    expiresInHours?: number;
  }): Promise<PreRegistration> {
    // Generate a random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresInHours = userData.expiresInHours || 24; // Default 24 hours

    // Insert the token into the database
    await db.insert(preRegistration).values({
      token,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      createdBy: userData.createdBy,
    });

    return {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      token,
    } as PreRegistration;
  }

  async getTokenData(token: string): Promise<PreRegistration> {
    // Fetch the token from the database
    const rows = await db
      .select()
      .from(preRegistration)
      .where(
        and(
          eq(preRegistration.token, token),
          isNull(preRegistration.assignedTo)
        )
      );

    if (rows.length === 0) {
      throw new BadRequestError("Token inválido");
    }

    const tokenData = rows[0];

    // Check if the token has already been used
    if (tokenData.usedAt) {
      throw new ExpirationError("El token ya ha sido usado anteriormente");
    }

    // Check if the token has expired
    if (new Date() > tokenData.expiresAt) {
      throw new ExpirationError("El token ya ha expirado");
    }

    // Return the token data
    return {
      email: tokenData.email,
      name: tokenData.name,
      role: tokenData.role,
    } as PreRegistration;
  }

  async completeTokenRegistration(
    token: string,
    preRegistrationData: PreRegistration,
    registerRequest: RegisterRequest,
    permissionList: string[]
  ): Promise<Auth> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create the user with hashed password
      const hashedPassword = await bcrypt.hash(registerRequest.password, 10);

      const newUserInsert = await tx
        .insert(users)
        .values({
          email: preRegistrationData.email,
          name: preRegistrationData.name,
          role: preRegistrationData.role as any,
          passwordHash: hashedPassword,
          permissions: permissionList,
          isVerified: true,
          status: UserStatus.ACTIVE,
        })
        .returning({
          id: users.userId,
          name: users.name,
          email: users.email,
          user_role: users.role as any,
          permissions: users.permissions,
        });

      const newUser = newUserInsert[0];

      // Mark provided token as used
      await tx
        .update(preRegistration)
        .set({ usedAt: new Date(), assignedTo: newUser.id })
        .where(eq(preRegistration.token, token));

      await tx.insert(userProfiles).values({
        userId: newUser.id,
        firstName: newUser.name,
        lastName: registerRequest.last_name,
        phoneNumber: registerRequest.phone_number,
      });

      return {
        id: newUser.id,
        email: preRegistrationData.email,
        name: preRegistrationData.name,
        role: newUser.user_role,
        permissions: newUser.permissions,
      };
    });
  }
}
