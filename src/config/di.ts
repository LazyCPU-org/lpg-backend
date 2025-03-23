import {
  AuthRepository,
  PgAuthRepository,
} from "../repositories/authRepository";
import { AuthService } from "../services/authService";
import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";

export interface Container {
  authRepository: AuthRepository;
  authService: AuthService;
  loginStrategyFactory: LoginStrategyFactory;
  registrationStrategyFactory: RegistrationStrategyFactory;
}

export function createContainer(): Container {
  // Create dependencies
  const authRepository = new PgAuthRepository();
  const registrationStrategyFactory = new RegistrationStrategyFactory(
    authRepository
  );
  const loginStrategyFactory = new LoginStrategyFactory(authRepository);
  const authService = new AuthService(authRepository);

  // Return container with all dependencies
  return {
    authRepository,
    authService,
    loginStrategyFactory,
    registrationStrategyFactory,
  };
}

// For testing, create a function to create a container with mock dependencies
export function createTestContainer(
  mockAuthRepository?: AuthRepository
): Container {
  const authRepository = mockAuthRepository || new PgAuthRepository();
  const registrationStrategyFactory = new RegistrationStrategyFactory(
    authRepository
  );
  const loginStrategyFactory = new LoginStrategyFactory(authRepository);
  const authService = new AuthService(authRepository);

  return {
    authRepository,
    authService,
    loginStrategyFactory,
    registrationStrategyFactory,
  };
}
