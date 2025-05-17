import { Auth } from "../../dtos/response/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";
import { SafeUser } from "../../dtos/response/userInterface";
import { InternalError } from "../../utils/custom-errors";

export class DeliveryLoginStrategy implements LoginStrategy {
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

    // Delivery-specific validation
    const payload = {
      email: user.email,
      role: UserRoleEnum.DELIVERY,
      permissions: user.permissions,
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "24h" }); // Shorter expiration for delivery personnel

    return {
      id: user.userId,
      name: user.name,
      email: user.email,
      user_role: user.role,
      token,
      permissions: user.permissions,
    } as Auth;
  }
}
