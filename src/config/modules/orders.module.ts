import { PgCustomerRepository } from "../../repositories";
import {
  IOrderRepository,
  IOrderWorkflowRepository,
  PgInventoryReservationRepository,
  PgOrderRepository,
  PgOrderWorkflowRepository,
} from "../../repositories/orders";
import {
  IInventoryReservationService,
  InventoryReservationService,
  IOrderService,
  IOrderWorkflowService,
  OrderService,
  OrderWorkflowService,
} from "../../services/orders";
import { DIModule, CoreDependencies } from "../types/moduleTypes";
import { InventoryDependencies } from "./inventory.module";

export interface OrdersDependencies {
  // Repositories
  orderRepository: IOrderRepository;
  orderWorkflowRepository: IOrderWorkflowRepository;
  inventoryReservationRepository: PgInventoryReservationRepository;
  customerRepository: PgCustomerRepository;
  
  // Services
  orderService: IOrderService;
  orderWorkflowService: IOrderWorkflowService;
  inventoryReservationService: IInventoryReservationService;
}

export class OrdersModule implements DIModule<OrdersDependencies> {
  private dependencies: OrdersDependencies | null = null;

  createDependencies(
    coreDeps: CoreDependencies, 
    inventoryDeps: InventoryDependencies
  ): OrdersDependencies {
    // Create repositories
    const inventoryReservationRepository = new PgInventoryReservationRepository();
    const orderRepository = new PgOrderRepository();
    const orderWorkflowRepository = new PgOrderWorkflowRepository();
    const customerRepository = new PgCustomerRepository();

    // Create services (depends on inventory transaction repository)
    const inventoryReservationService = new InventoryReservationService(
      inventoryReservationRepository,
      inventoryDeps.inventoryTransactionRepository
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

    this.dependencies = {
      orderRepository,
      orderWorkflowRepository,
      inventoryReservationRepository,
      customerRepository,
      orderService,
      orderWorkflowService,
      inventoryReservationService,
    };

    return this.dependencies;
  }

  getDependencies(): OrdersDependencies {
    if (!this.dependencies) {
      throw new Error("Orders dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}