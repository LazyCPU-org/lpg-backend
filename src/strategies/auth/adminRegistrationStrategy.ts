import { AuthRepository } from "../../repositories/authRepository";
import { RegistrationStrategy } from "./registrationStrategy";
import { selectSafeUserSchema } from "../../interfaces/models/userInterface";

export class AdminRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(userId: number): Promise<boolean> {
    // Get user information
    const user = await this.authRepository.findUserById(userId);
    const safeUser = selectSafeUserSchema.parse(user);
    return await this.authRepository.createAdminByUser(safeUser);
  }
}
