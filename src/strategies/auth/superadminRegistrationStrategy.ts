import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import { RegistrationStrategy } from "./registrationStrategy";
import { UnauthorizedError } from "../../utils/custom-errors";

export class SuperadminRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<Auth> {
    // Superadmin-specific logic
    const exist = await this.authRepository.superadminExists();
    if (exist) throw new UnauthorizedError();

    const hashedPassword = await bcrypt.hash(registerRequest.password, 14); // Stronger hash for superadmins

    // Additional admin-specific validation or processing

    registerRequest.password = hashedPassword;
    const user = this.authRepository.registerByRole(
      registerRequest,
      UserRoleEnum.SUPERADMIN
    );

    return user;
  }
}
