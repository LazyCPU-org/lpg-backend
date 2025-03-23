import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import { RegistrationStrategy } from "./registrationStrategy";

export class AdminRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<Auth> {
    // Admin-specific logic
    const hashedPassword = await bcrypt.hash(registerRequest.password, 12); // Strong hash for admins

    registerRequest.password = hashedPassword;
    return this.authRepository.registerByRole(
      registerRequest,
      UserRoleEnum.ADMIN
    );
  }
}
