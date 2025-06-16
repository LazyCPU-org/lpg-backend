import { Express, NextFunction, Request, Response } from "express";
import { Container } from "../config/di";
import { buildAuthRouter } from "./authRoutes";
import { buildInventoryAssignmentRouter } from "./inventoryAssignmentRoutes";
import { buildInventoryStatusHistoryRouter } from "./inventoryStatusHistoryRoutes";
import { buildInventoryTransactionRouter } from "./inventoryTransactionRoutes";
import { buildStoreRouter } from "./storeRoutes";
import { buildUserRouter } from "./userRoutes";
import { buildOrderRoutes } from "./orders";

// Middleware to inject container into request
const injectContainer = (container: Container) => {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).container = container;
    next();
  };
};

export const defineRoutes = function (app: Express, container: Container) {
  // Version 1 routes
  const v1BasePath = "/v1";

  // Inject container into all requests
  app.use(injectContainer(container));

  // Create routers with injected dependencies
  const authRouter = buildAuthRouter(container.authService);
  const userRouter = buildUserRouter(container.userService);
  const storeRouter = buildStoreRouter(container.storeService);

  // Inventory module routers
  const inventoryAssignments = buildInventoryAssignmentRouter(
    container.inventoryAssignmentService
  );
  const inventoryStatusHistory = buildInventoryStatusHistoryRouter(
    container.inventoryStatusHistoryService
  );
  const inventoryTransactions = buildInventoryTransactionRouter(
    container.inventoryTransactionService
  );

  // Orders module router
  const orderRouter = buildOrderRoutes({
    orderService: container.orderService,
    orderWorkflowService: container.orderWorkflowService,
    inventoryReservationService: container.inventoryReservationService,
  });

  // Mount routers
  app.use(`${v1BasePath}/auth`, authRouter);
  app.use(`${v1BasePath}/users`, userRouter);
  app.use(`${v1BasePath}/stores`, storeRouter);

  // Inventory module routes
  app.use(`${v1BasePath}/inventory/assignments`, inventoryAssignments);
  app.use(`${v1BasePath}/inventory/status-history`, inventoryStatusHistory);
  app.use(`${v1BasePath}/inventory/transactions`, inventoryTransactions);

  // Orders module routes
  app.use(`${v1BasePath}/orders`, orderRouter);
};
