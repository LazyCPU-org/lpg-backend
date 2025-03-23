import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import { RegistrationStrategy } from "./registrationStrategy";

export class DeliveryRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<Auth> {
    // Delivery-specific logic here
    const hashedPassword = await bcrypt.hash(registerRequest.password, 8);

    // Delivery users might need additional fields or validations

    registerRequest.password = hashedPassword;
    return this.authRepository.registerByRole(
      registerRequest,
      UserRoleEnum.DELIVERY
    );
  }
}
