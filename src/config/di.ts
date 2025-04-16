import {
  AuthRepository,
  PgAuthRepository,
} from "../repositories/authRepository";
import { AuthService } from "../services/authService";
import { AuthServiceInterface } from "../interfaces/authServiceInterface";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import {
  PgUserRepository,
  UserRepository,
} from "../repositories/userRepository";
import { PermissionManager } from "../utils/permission-actions";

export interface Container {
  authRepository: AuthRepository;
  userRepository: UserRepository;
  authService: AuthServiceInterface;
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
  const authService = new AuthService(authRepository);
  const permissionManager = new PermissionManager(
    authRepository,
    userRepository
  );

  // Return container with all dependencies
  return {
    authRepository,
    userRepository,
    authService,
    loginStrategyFactory,
    registrationStrategyFactory,
    permissionManager,
  };
}

// For testing, create a function to create a container with mock dependencies
/* export function createTestContainer(
  mockAuthRepository?: AuthRepository,
  mockUserRepository?: UserRepository
): Container {
  const authRepository = mockAuthRepository || new PgAuthRepository();
  const userRepository = mockUserRepository || new PgUserRepository();
  const registrationStrategyFactory = new RegistrationStrategyFactory(
    authRepository
  );
  const loginStrategyFactory = new LoginStrategyFactory(authRepository);
  const authService = new AuthService(authRepository);
  const permissionManager = new PermissionManager(authRepository, userRepository);

  return {
    authRepository,
    userRepository,
    authService,
    loginStrategyFactory,
    registrationStrategyFactory,
    permissionManager,
  };
} */
