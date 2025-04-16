import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";

export class DeliveryLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Delivery-specific login logic
    const user = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.DELIVERY
    );
    if (!user) return null;

    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword) return null;

    // Delivery-specific validation

    const payload = {
      email: user.email,
      role: UserRoleEnum.DELIVERY,
      permissions: ["view_deliveries", "update_delivery_status"],
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "8h" }); // Shorter expiration for delivery personnel

    return {
      id: user.userId,
      email: user.email,
      role: UserRoleEnum.DELIVERY,
      token,
    };
  }
}
