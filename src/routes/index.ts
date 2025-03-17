import { Express } from "express";
import userRoutes from "./userRoutes";

export const defineRoutes = function (app: Express) {
  // Version 1 routes
  const v1BasePath = "/api/v1";
  app.use(`${v1BasePath}/users`, userRoutes);

  // For future versions
  // const v2BasePath = "api/v2";
  // app.use(`${v2BasePath}/users`, v2UserRoutes);
};
