import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/models/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import { RegistrationStrategy } from "./registrationStrategy";

export class OperatorRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<Auth> {
    // Operator-specific logic here
    const hashedPassword = await bcrypt.hash(registerRequest.password, 10);

    // Additional operator-specific processing

    registerRequest.password = hashedPassword;
    return this.authRepository.registerByRole(
      registerRequest,
      UserRoleEnum.OPERATOR
    );
  }
}
