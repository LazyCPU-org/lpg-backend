import { Express, Request, Response, NextFunction } from "express";
import { createAuthRouter } from "./authRoutes";
import { Container } from "../config/di";

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
  const authRouter = createAuthRouter(container.authService);

  // Mount routers
  app.use(`${v1BasePath}/auth`, authRouter);

  // Other routes would follow the same pattern
  // app.use(`${v1BasePath}/users`, createUserRouter(container.userService));
};
