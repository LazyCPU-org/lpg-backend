import { Auth, PreRegistration } from "../interfaces/models/authInterface";
import { AuthRepository } from "../repositories/authRepository";
import { PreRegistrationRequest, RegisterRequest } from "../dtos/authDTO";
import { UserRoleEnum } from "../config/roles";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";

import { AuthServiceInterface } from "../interfaces/services/authServiceInterface";
import { getPermissionsByRole } from "../utils/permissions";

export class AuthService implements AuthServiceInterface {
  private authRepository: AuthRepository;
  private registrationStrategyFactory: RegistrationStrategyFactory;
  private loginStrategyFactory: LoginStrategyFactory;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
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

  async createRegistrationToken(
    userData: PreRegistrationRequest,
    createdBy: number,
    expiresInHours?: number
  ): Promise<PreRegistration> {
    // Generate a token
    return this.authRepository.createRegistrationToken({
      ...userData,
      createdBy,
      expiresInHours,
    });
  }

  verifyRegistrationToken(token: string): Promise<PreRegistration> {
    return this.authRepository.getTokenData(token);
  }

  async completeTokenRegistration(
    token: string,
    preRegistrationData: PreRegistration,
    registerRequest: RegisterRequest
  ): Promise<Auth> {
    const permissionList = getPermissionsByRole(preRegistrationData.role);

    const registerUserRequest =
      await this.authRepository.completeTokenRegistration(
        token, // Token provided by user
        preRegistrationData, // Data already defined by pre-register
        registerRequest, // Data provided by user to register its user
        permissionList // List of permissions given for the role
      );

    if (registerUserRequest.id) {
      const registrationStrategy =
        this.registrationStrategyFactory.createStrategy(
          preRegistrationData.role
        );
      await registrationStrategy.register(registerUserRequest.id);
    }

    return registerUserRequest;
  }
}
