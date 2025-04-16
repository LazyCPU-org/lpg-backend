import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";
import { User, type SudoAdmin } from "../../interfaces/models/userInterface";
import { NotFoundError, UnauthorizedError } from "../../utils/custom-errors";
import { PermissionSets } from "../../utils/permissions";

export class SuperadminLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Admin-specific login logic
    const user: User | null = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.SUPERADMIN
    );
    if (!user) throw new NotFoundError();

    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword)
      throw new UnauthorizedError("Invalid provided credentials");

    const sudoAdmin: SudoAdmin | null =
      await this.authRepository.findSudoAdminByUserId(user.userId);
    if (!sudoAdmin) throw new NotFoundError();

    // Parse permissions from the database
    let permissions: string[];
    try {
      // If permissions are stored as a JSON string
      permissions =
        typeof sudoAdmin.permissions === "string"
          ? JSON.parse(sudoAdmin.permissions)
          : sudoAdmin.permissions || [];

      // If we don't have permissions yet, use the default SUPERADMIN permissions
      if (!permissions || permissions.length === 0) {
        permissions = PermissionSets.SUPERADMIN;
      }
    } catch (error) {
      // Default to SUPERADMIN permissions if parsing fails
      permissions = PermissionSets.SUPERADMIN;
    }

    // Update the last login timestamp
    await this.authRepository.updateSudoAdminPermissions(
      user.userId,
      permissions
    );

    const payload = {
      id: sudoAdmin.sudoadminId,
      userId: user.userId,
      role: UserRoleEnum.SUPERADMIN,
      permissions: permissions,
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "30min" });

    return {
      id: user.userId,
      email: user.email,
      token,
    } as Auth;
  }
}
