import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";
import { User } from "../../interfaces/models/userInterface";
import { NotFoundError, UnauthorizedError } from "../../utils/custom-errors";
import { permission } from "process";

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

    const payload = {
      id: user.userId,
      userId: user.userId,
      role: user.role,
      permissions: user.permissions,
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "60min" });

    return {
      id: user.userId,
      email: user.email,
      current_role: user.role,
      token,
      permissions: user.permissions,
    } as Auth;
  }
}
