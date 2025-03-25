import { LoginStrategy } from "../../strategies/auth/loginStrategy";
import { AdminLoginStrategy } from "../../strategies/auth/adminLoginStrategy";
import { OperatorLoginStrategy } from "../../strategies/auth/operatorLoginStrategy";
import { DeliveryLoginStrategy } from "../../strategies/auth/deliveryLoginStrategy";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import { SuperadminLoginStrategy } from "../../strategies/auth/superadminLoginStrategy";

export class LoginStrategyFactory {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  createStrategy(
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): LoginStrategy {
    switch (role) {
      case UserRoleEnum.SUPERADMIN:
        return new SuperadminLoginStrategy(this.authRepository);
      case UserRoleEnum.ADMIN:
        return new AdminLoginStrategy(this.authRepository);
      case UserRoleEnum.OPERATOR:
        return new OperatorLoginStrategy(this.authRepository);
      case UserRoleEnum.DELIVERY:
        return new DeliveryLoginStrategy(this.authRepository);
      default:
        throw new Error(`Unsupported role: ${role}`);
    }
  }
}
