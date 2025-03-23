import { Express } from "express";
import { createAuthRouter } from "./authRoutes";
import { Container } from "../config/di";

export const defineRoutes = function (app: Express, container: Container) {
  // Version 1 routes
  const v1BasePath = "/api/v1";

  // Create routers with injected dependencies
  const authRouter = createAuthRouter(container.authService);

  // Mount routers
  app.use(`${v1BasePath}/auth`, authRouter);

  // Other routes would follow the same pattern
  // app.use(`${v1BasePath}/users`, createUserRouter(container.userService));
};
