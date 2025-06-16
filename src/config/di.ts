import { LoginStrategyFactory } from "../factories/auth/loginStrategyFactory";
import { RegistrationStrategyFactory } from "../factories/auth/registrationStrategyFactory";
import {
  AuthRepository,
  PgAuthRepository,
} from "../repositories/authRepository";
import {
  PgStoreRepository,
  StoreRepository,
} from "../repositories/storeRepository";
import {
  PgUserRepository,
  UserRepository,
} from "../repositories/userRepository";

// Clean domain-based imports for inventory
import {
  IInventoryAssignmentRepository,
  IInventoryTransactionRepository,
  IItemAssignmentRepository,
  ITankAssignmentRepository,
  PgInventoryAssignmentRepository,
  PgInventoryTransactionRepository,
  PgItemAssignmentRepository,
  PgTankAssignmentRepository,
} from "../repositories/inventory";

// Order repository imports
import {
  IOrderRepository,
  IOrderWorkflowRepository,
  PgInventoryReservationRepository,
  PgOrderRepository,
  PgOrderWorkflowRepository,
} from "../repositories/orders";

import { AuthService, IAuthService } from "../services/authService";
import { DateService, IDateService } from "../services/dateService";
import {
  IInventoryAssignmentService,
  IInventoryDateService,
  IInventoryStatusHistoryService,
  IInventoryTransactionService,
  InventoryAssignmentService,
  InventoryDateService,
  InventoryStatusHistoryService,
  InventoryTransactionService,
} from "../services/inventory";

// Order service imports
import { PgCustomerRepository } from "../repositories";
import {
  IInventoryReservationService,
  InventoryReservationService,
  IOrderService,
  IOrderWorkflowService,
  OrderService,
  OrderWorkflowService,
} from "../services/orders";
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
  dateService: IDateService;
  inventoryDateService: IInventoryDateService;

  // Strategies
  loginStrategyFactory: LoginStrategyFactory;
  registrationStrategyFactory: RegistrationStrategyFactory;
  permissionManager: PermissionManager;

  // Inventory module - split repositories
  inventoryAssignmentRepository: IInventoryAssignmentRepository;
  inventoryTransactionRepository: IInventoryTransactionRepository;
  tankAssignmentRepository: ITankAssignmentRepository;
  itemAssignmentRepository: IItemAssignmentRepository;
  inventoryAssignmentService: IInventoryAssignmentService;

  // Inventory audit module
  inventoryStatusHistoryService: IInventoryStatusHistoryService;

  // Inventory transaction module
  inventoryTransactionService: IInventoryTransactionService;

  // Orders module - repositories
  orderRepository: IOrderRepository;
  orderWorkflowRepository: IOrderWorkflowRepository;
  inventoryReservationRepository: PgInventoryReservationRepository;

  // Orders module - services
  orderService: IOrderService;
  orderWorkflowService: IOrderWorkflowService;
  inventoryReservationService: IInventoryReservationService;
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

  // Create date services
  const dateService = new DateService();
  const inventoryDateService = new InventoryDateService(dateService);

  // Create inventory module dependencies with improved domain structure
  const tankAssignmentRepository = new PgTankAssignmentRepository();
  const itemAssignmentRepository = new PgItemAssignmentRepository();

  const inventoryAssignmentRepository = new PgInventoryAssignmentRepository(
    tankAssignmentRepository,
    itemAssignmentRepository
  );

  const inventoryTransactionRepository = new PgInventoryTransactionRepository(
    inventoryDateService,
    inventoryAssignmentRepository
  );

  const inventoryAssignmentService = new InventoryAssignmentService(
    inventoryAssignmentRepository,
    tankAssignmentRepository,
    itemAssignmentRepository,
    inventoryTransactionRepository,
    inventoryDateService
  );

  // Create inventory status history service
  const inventoryStatusHistoryService = new InventoryStatusHistoryService();

  // Create inventory transaction service
  const inventoryTransactionService = new InventoryTransactionService(
    inventoryTransactionRepository
  );

  // Create orders module dependencies (placeholder until services are fully implemented)
  const inventoryReservationRepository = new PgInventoryReservationRepository();
  const orderRepository = new PgOrderRepository();
  const orderWorkflowRepository = new PgOrderWorkflowRepository();
  const customerRepository = new PgCustomerRepository();

  // Create inventory reservation service
  const inventoryReservationService = new InventoryReservationService(
    inventoryReservationRepository,
    inventoryTransactionRepository
  );

  const orderService = new OrderService(
    orderRepository,
    customerRepository,
    inventoryReservationService
  );
  const orderWorkflowService = new OrderWorkflowService(
    orderRepository,
    orderWorkflowRepository,
    inventoryReservationService
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
    dateService,
    inventoryDateService,

    // Inventory module
    inventoryAssignmentRepository,
    inventoryTransactionRepository,
    tankAssignmentRepository,
    itemAssignmentRepository,
    inventoryAssignmentService,

    // Inventory audit module
    inventoryStatusHistoryService,

    // Inventory transaction module
    inventoryTransactionService,

    // Orders module - repositories
    orderRepository,
    orderWorkflowRepository,
    inventoryReservationRepository,

    // Orders module - services
    orderService,
    orderWorkflowService,
    inventoryReservationService,
  };
}
