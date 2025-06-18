import jwt from "jsonwebtoken";
import { UserRoleEnum } from "../../config/roles";
import { Auth } from "../../dtos/response/authInterface";
import { SafeUser } from "../../dtos/response/userInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { InternalError } from "../../utils/custom-errors";
import { LoginStrategy } from "./loginStrategy";

export class OperatorLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(user: SafeUser): Promise<Auth | null> {
    const updateLastLogin = await this.authRepository.updateLastLogin(
      user.userId
    );
    if (!updateLastLogin)
      throw new InternalError("Error interno, intenta nuevamente");

    // Operator-specific validation
    const payload = {
      id: user.userId,
      email: user.email,
      role: UserRoleEnum.OPERATOR,
      permissions: user.permissions,
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "1d" });

    return {
      id: user.userId,
      name: user.name,
      email: user.email,
      user_role: UserRoleEnum.OPERATOR,
      token,
      permissions: user.permissions,
    } as Auth;
  }
}
