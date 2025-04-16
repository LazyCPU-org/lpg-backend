import {
  AuthRepository,
  PgAuthRepository,
} from "../repositories/authRepository";
import { AuthService } from "../services/authService";
import { AuthServiceInterface } from "../interfaces/services/authServiceInterface";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import {
  PgUserRepository,
  UserRepository,
} from "../repositories/userRepository";
import { PermissionManager } from "../utils/permission-actions";
import { UserServiceInterface } from "../interfaces/services/userServiceInterface";
import { UserService } from "../services/userService";

export interface Container {
  authRepository: AuthRepository;
  userRepository: UserRepository;
  authService: AuthServiceInterface;
  userService: UserServiceInterface;
  loginStrategyFactory: LoginStrategyFactory;
  registrationStrategyFactory: RegistrationStrategyFactory;
  permissionManager: PermissionManager;
}

export function createContainer(): Container {
  // Create dependencies
  const authRepository = new PgAuthRepository();
  const userRepository = new PgUserRepository();
  const registrationStrategyFactory = new RegistrationStrategyFactory(
    authRepository
  );
  const loginStrategyFactory = new LoginStrategyFactory(authRepository);

  const permissionManager = new PermissionManager(
    authRepository,
    userRepository
  );

  const authService = new AuthService(authRepository);
  const userService = new UserService(userRepository);

  // Return container with all dependencies
  return {
    // Utils
    loginStrategyFactory,
    registrationStrategyFactory,
    permissionManager,

    // Repositories
    authRepository,
    userRepository,

    // Services
    authService,
    userService,
  };
}
