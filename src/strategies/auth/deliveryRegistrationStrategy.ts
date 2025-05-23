import { AuthRepository } from "../../repositories/authRepository";
import { RegistrationStrategy } from "./registrationStrategy";
import { selectSafeUserSchema } from "../../dtos/response/userInterface";

export class DeliveryRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(userId: number): Promise<boolean> {
    // Get user information
    const user = await this.authRepository.findUserById(userId);
    const safeUser = selectSafeUserSchema.parse(user);
    return await this.authRepository.createDeliveryByUser(safeUser);
  }
}
