import {
  IInventoryAssignmentRepository,
  IInventoryTransactionRepository,
  IItemAssignmentRepository,
  ITankAssignmentRepository,
  PgInventoryAssignmentRepository,
  PgInventoryTransactionRepository,
  PgItemAssignmentRepository,
  PgTankAssignmentRepository,
} from "../../repositories/inventory";
import {
  IInventoryAssignmentService,
  IInventoryStatusHistoryService,
  IInventoryTransactionService,
  InventoryAssignmentService,
  InventoryStatusHistoryService,
  InventoryTransactionService,
} from "../../services/inventory";
import { DIModule, CoreDependencies } from "../types/moduleTypes";

export interface InventoryDependencies {
  // Repositories
  inventoryAssignmentRepository: IInventoryAssignmentRepository;
  inventoryTransactionRepository: IInventoryTransactionRepository;
  tankAssignmentRepository: ITankAssignmentRepository;
  itemAssignmentRepository: IItemAssignmentRepository;
  
  // Services
  inventoryAssignmentService: IInventoryAssignmentService;
  inventoryStatusHistoryService: IInventoryStatusHistoryService;
  inventoryTransactionService: IInventoryTransactionService;
}

export class InventoryModule implements DIModule<InventoryDependencies> {
  private dependencies: InventoryDependencies | null = null;

  createDependencies(coreDeps: CoreDependencies): InventoryDependencies {
    // Create repositories
    const tankAssignmentRepository = new PgTankAssignmentRepository();
    const itemAssignmentRepository = new PgItemAssignmentRepository();

    const inventoryAssignmentRepository = new PgInventoryAssignmentRepository(
      tankAssignmentRepository,
      itemAssignmentRepository
    );

    const inventoryTransactionRepository = new PgInventoryTransactionRepository(
      coreDeps.inventoryDateService,
      inventoryAssignmentRepository
    );

    // Create services
    const inventoryAssignmentService = new InventoryAssignmentService(
      inventoryAssignmentRepository,
      tankAssignmentRepository,
      itemAssignmentRepository,
      inventoryTransactionRepository,
      coreDeps.inventoryDateService
    );

    const inventoryStatusHistoryService = new InventoryStatusHistoryService();

    const inventoryTransactionService = new InventoryTransactionService(
      inventoryTransactionRepository
    );

    this.dependencies = {
      inventoryAssignmentRepository,
      inventoryTransactionRepository,
      tankAssignmentRepository,
      itemAssignmentRepository,
      inventoryAssignmentService,
      inventoryStatusHistoryService,
      inventoryTransactionService,
    };

    return this.dependencies;
  }

  getDependencies(): InventoryDependencies {
    if (!this.dependencies) {
      throw new Error("Inventory dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}