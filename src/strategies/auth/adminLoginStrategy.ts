import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";
import { User } from "../../interfaces/userInterface";
import { NotFoundError, UnauthorizedError } from "../../utils/custom-errors";
import { PermissionSets } from "../../utils/permissions";

export class AdminLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Find the admin user
    const user: User | null = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.ADMIN
    );
    if (!user) throw new NotFoundError();

    // Verify password
    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword)
      throw new UnauthorizedError("Invalid provided credentials");

    // Get admin-specific data
    const admin = await this.authRepository.findAdminByUserId(user.userId);
    if (!admin) throw new NotFoundError();

    // Parse permissions from the database
    let permissions: string[];
    try {
      // If permissions are stored as a JSON string
      permissions =
        typeof admin.permissions === "string"
          ? JSON.parse(admin.permissions)
          : admin.permissions || [];

      // If we don't have permissions yet, use the default ADMIN permissions
      if (!permissions || permissions.length === 0) {
        permissions = PermissionSets.ADMIN_PERMISSIONS;
      }
    } catch (error) {
      // Default to ADMIN permissions if parsing fails
      permissions = PermissionSets.ADMIN_PERMISSIONS;
    }

    // Update the permissions in case we applied defaults
    await this.authRepository.updateAdminPermissions(user.userId, permissions);

    // Create JWT payload
    const payload = {
      id: admin.adminId,
      userId: user.userId,
      role: UserRoleEnum.ADMIN,
      permissions: permissions,
    };

    // Sign and return token
    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "30min" });

    return {
      id: user.userId,
      email: user.email,
      token,
    } as Auth;
  }
}
