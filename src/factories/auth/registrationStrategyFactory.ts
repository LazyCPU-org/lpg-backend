import { RegistrationStrategy } from "../../strategies/auth/registrationStrategy";
import { AdminRegistrationStrategy } from "../../strategies/auth/adminRegistrationStrategy";
import { OperatorRegistrationStrategy } from "../../strategies/auth/operatorRegistrationStrategy";
import { DeliveryRegistrationStrategy } from "../../strategies/auth/deliveryRegistrationStrategy";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import { SuperadminRegistrationStrategy } from "../../strategies/auth/superadminRegistrationStrategy";

export class RegistrationStrategyFactory {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  createStrategy(
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): RegistrationStrategy {
    switch (role) {
      case UserRoleEnum.SUPERADMIN:
        return new SuperadminRegistrationStrategy(this.authRepository);
      case UserRoleEnum.ADMIN:
        return new AdminRegistrationStrategy(this.authRepository);
      case UserRoleEnum.OPERATOR:
        return new OperatorRegistrationStrategy(this.authRepository);
      case UserRoleEnum.DELIVERY:
        return new DeliveryRegistrationStrategy(this.authRepository);
      default:
        throw new Error(`Unsupported role: ${role}`);
    }
  }
}
