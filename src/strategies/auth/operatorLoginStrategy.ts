import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";

export class OperatorLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Operator-specific login logic
    const user = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.OPERATOR
    );
    if (!user) return null;

    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword) return null;

    // Operator-specific validation

    const payload = {
      email: user.email,
      role: UserRoleEnum.OPERATOR,
      permissions: ["process_orders", "manage_inventory"],
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "1d" });

    return {
      id: user.userId,
      email: user.email,
      role: UserRoleEnum.OPERATOR,
      token,
    };
  }
}
