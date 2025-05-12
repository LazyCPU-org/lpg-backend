import { Auth, PreRegistration } from "../interfaces/models/authInterface";
import { AuthRepository } from "../repositories/authRepository";
import { PreRegistrationRequest, RegisterRequest } from "../dtos/authDTO";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";

import { AuthServiceInterface } from "../interfaces/services/authServiceInterface";
import { getPermissionsByRole } from "../utils/permissions";
import {
  SafeUser,
  selectSafeUserSchema,
} from "../interfaces/models/userInterface";
import { UserStatus } from "../utils/status";
import { UnauthorizedError } from "../utils/custom-errors";

import bcrypt from "bcrypt";

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

  async verifyLoginCredentials(
    email: string,
    password: string
  ): Promise<SafeUser> {
    const user = await this.authRepository.findUserByEmail(email);
    if (
      user.status === UserStatus.BLOCKED ||
      user.status === UserStatus.INACTIVE
    ) {
      throw new UnauthorizedError(
        "No tienes permitido ingresar a la plataforma"
      );
    }

    // Verify password
    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword)
      throw new UnauthorizedError("Usuario/Contraseña incorrectos");

    return selectSafeUserSchema.parse(user);
  }

  async loginUser(user: SafeUser): Promise<Auth | null> {
    const loginStrategy = this.loginStrategyFactory.createStrategy(user.role);
    return loginStrategy.login(user);
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
