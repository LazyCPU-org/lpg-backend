import { AuthRepository } from "../../repositories/authRepository";
import { RegistrationStrategy } from "./registrationStrategy";
import { UnauthorizedError } from "../../utils/custom-errors";

export class SuperadminRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(userId: number): Promise<boolean> {
    throw new UnauthorizedError(); // We don't want to register superadmins
  }
}
