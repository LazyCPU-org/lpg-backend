import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import {
  AuthRepository,
  PgAuthRepository,
} from "../repositories/authRepository";
import {
  InventoryAssignmentRepository,
  PgInventoryAssignmentRepository,
} from "../repositories/inventoryAssignmentRepository";
import {
  PgStoreRepository,
  StoreRepository,
} from "../repositories/storeRepository";
import {
  PgUserRepository,
  UserRepository,
} from "../repositories/userRepository";
import { AuthService, IAuthService } from "../services/authService";
import {
  IInventoryAssignmentService,
  InventoryAssignmentService,
} from "../services/inventoryAssignmentService";
import { IStoreService, StoreService } from "../services/storeService";
import { IUserService, UserService } from "../services/userService";
import { PermissionManager } from "../utils/permission-actions";

export interface Container {
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
  permissionManager: PermissionManager;

  // Inventory module
  inventoryAssignmentRepository: InventoryAssignmentRepository;
  inventoryAssignmentService: IInventoryAssignmentService;
}

export function createContainer(): Container {
  // Create dependencies
  const authRepository = new PgAuthRepository();
  const userRepository = new PgUserRepository();
  const storeRepository = new PgStoreRepository();

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
  const storeService = new StoreService(storeRepository);

  // Create inventory module dependencies
  const inventoryAssignmentRepository = new PgInventoryAssignmentRepository();
  const inventoryAssignmentService = new InventoryAssignmentService(
    inventoryAssignmentRepository
  );

  // Return container with all dependencies
  return {
    // Utils
    loginStrategyFactory,
    registrationStrategyFactory,
    permissionManager,

    // Repositories
    authRepository,
    userRepository,
    storeRepository,

    // Services
    authService,
    userService,
    storeService,

    inventoryAssignmentRepository,
    inventoryAssignmentService,
  };
}
