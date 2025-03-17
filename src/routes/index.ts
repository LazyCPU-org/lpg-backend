import { Express } from "express";
import userRoutes from "./userRoutes";

export const defineRoutes = function (app: Express) {
  // Version 1 routes
  const v1BasePath = "/v1/api";
  app.use(`${v1BasePath}/users`, userRoutes);

  // For future versions
  // const v2BasePath = "/v2/api";
  // app.use(`${v2BasePath}/users`, v2UserRoutes);
};
