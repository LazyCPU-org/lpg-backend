import { Express, NextFunction, Request, Response } from "express";
import { Container } from "../config/di";
import { buildAuthRouter } from "./authRoutes";
import { buildInventoryAssignmentRouter } from "./inventoryAssignmentRoutes";
import { buildStoreRouter } from "./storeRoutes";
import { buildUserRouter } from "./userRoutes";

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
  const inventoryAssignments = buildInventoryAssignmentRouter(
    container.inventoryAssignmentService
  );

  // Mount routers
  app.use(`${v1BasePath}/auth`, authRouter);
  app.use(`${v1BasePath}/users`, userRouter);
  app.use(`${v1BasePath}/stores`, storeRouter);
  app.use(`${v1BasePath}/assignments`, inventoryAssignments);
};
