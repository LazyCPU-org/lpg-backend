import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";

export class SuperadminLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Admin-specific login logic
    const user = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.SUPERADMIN
    );
    if (!user) return null;

    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword) return null;

    // Admin-specific validation can be added here

    const payload = {
      email: user.email,
      role: UserRoleEnum.SUPERADMIN,
      permissions: ["manage_all_users", "view_all_reports", "system_config"],
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "1d" });

    return {
      id: user.userId,
      email: user.email,
      role: UserRoleEnum.SUPERADMIN,
      token,
    };
  }
}
