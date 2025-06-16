import { LoginStrategyFactory } from "../../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../../factories/auth/registrationStrategyFactory";
import { AuthRepository, PgAuthRepository } from "../../repositories/authRepository";
import { PgStoreRepository, StoreRepository } from "../../repositories/storeRepository";
import { PgUserRepository, UserRepository } from "../../repositories/userRepository";
import { AuthService, IAuthService } from "../../services/authService";
import { IStoreService, StoreService } from "../../services/storeService";
import { IUserService, UserService } from "../../services/userService";
import { DIModule, CoreDependencies } from "../types/moduleTypes";

export interface AuthDependencies {
  // Repositories
  authRepository: AuthRepository;
  userRepository: UserRepository;
  storeRepository: StoreRepository;
  
  // Services
  authService: IAuthService;
  userService: IUserService;
  storeService: IStoreService;
  
  // Strategies
  loginStrategyFactory: LoginStrategyFactory;
  registrationStrategyFactory: RegistrationStrategyFactory;
}

export class AuthModule implements DIModule<AuthDependencies> {
  private dependencies: AuthDependencies | null = null;

  createDependencies(coreDeps: CoreDependencies): AuthDependencies {
    // Repositories
    const authRepository = new PgAuthRepository();
    const userRepository = new PgUserRepository();
    const storeRepository = new PgStoreRepository();

    // Strategies
    const registrationStrategyFactory = new RegistrationStrategyFactory(authRepository);
    const loginStrategyFactory = new LoginStrategyFactory(authRepository);

    // Services
    const authService = new AuthService(authRepository);
    const userService = new UserService(userRepository);
    const storeService = new StoreService(storeRepository);

    this.dependencies = {
      authRepository,
      userRepository,
      storeRepository,
      authService,
      userService,
      storeService,
      loginStrategyFactory,
      registrationStrategyFactory,
    };

    return this.dependencies;
  }

  getDependencies(): AuthDependencies {
    if (!this.dependencies) {
      throw new Error("Auth dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}