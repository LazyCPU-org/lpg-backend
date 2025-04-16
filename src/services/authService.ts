import { Auth } from "../interfaces/authInterface";
import { AuthRepository } from "../repositories/authRepository";
import { RegisterRequest } from "../dtos/authDTO";
import { UserRoleEnum } from "../config/roles";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";

import { AuthServiceInterface } from "../interfaces/authServiceInterface";

export class AuthService implements AuthServiceInterface {
  //private authRepository: AuthRepository;
  private registrationStrategyFactory: RegistrationStrategyFactory;
  private loginStrategyFactory: LoginStrategyFactory;

  constructor(authRepository: AuthRepository) {
    //this.authRepository = authRepository;
    this.registrationStrategyFactory = new RegistrationStrategyFactory(
      authRepository
    );
    this.loginStrategyFactory = new LoginStrategyFactory(authRepository);
  }

  async loginByRole(
    email: string,
    password: string,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth | null> {
    const loginStrategy = this.loginStrategyFactory.createStrategy(role);
    return loginStrategy.login(email, password);
  }

  async registerByRole(
    registerRequest: RegisterRequest,
    role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum]
  ): Promise<Auth> {
    const registrationStrategy =
      this.registrationStrategyFactory.createStrategy(role);
    return registrationStrategy.register(registerRequest);
  }
}
