import { Router } from "express";
import { IOrderService, IOrderWorkflowService } from "../../services/orders";
import { IInventoryReservationService } from "../../services/inventory/reservations";
import { buildOrderCrudRoutes } from "./orderCrudRoutes";
import { buildOrderWorkflowRoutes } from "./orderWorkflowRoutes";
import { buildOrderUtilityRoutes } from "./orderUtilityRoutes";

export interface OrderRoutesDependencies {
  orderService: IOrderService;
  orderWorkflowService: IOrderWorkflowService;
  inventoryReservationService: IInventoryReservationService;
}

/**
 * Main order routes builder that combines all order-related route modules
 */
export function buildOrderRoutes(dependencies: OrderRoutesDependencies) {
  const router = Router();
  
  // Mount sub-routers for different order functionalities
  router.use('/', buildOrderCrudRoutes(dependencies));
  router.use('/', buildOrderWorkflowRoutes(dependencies));
  router.use('/', buildOrderUtilityRoutes(dependencies));
  
  return router;
}

// Export individual route builders for testing
export { buildOrderCrudRoutes } from "./orderCrudRoutes";
export { buildOrderWorkflowRoutes } from "./orderWorkflowRoutes";
export { buildOrderUtilityRoutes } from "./orderUtilityRoutes";