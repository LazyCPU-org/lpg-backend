import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger";
import { defineRoutes } from "./src/routes";
import { createContainer } from "./src/config/di";
import {
  loadEnvironmentConfig,
  getServerConfig,
  validateEnv,
} from "./src/utils/config";
import { errorHandler } from "./src/middlewares/error-handler";

export function createApp() {
  // Load environment configuration
  const config = loadEnvironmentConfig();

  // Validate required environment variables
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];

  if (!validateEnv(requiredEnvVars)) {
    console.warn(
      "Some required environment variables are missing - this may cause issues"
    );
  }

  const app = express();
  const serverConfig = getServerConfig();

  // Create the dependency container
  const container = createContainer();

  // Middleware
  app.use(express.json());

  // Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    res.on("finish", () => {
      console.log(
        `[${timestamp}] ${req.method} ${req.url} - HTTP ${res.statusCode}`
      );
    });
    next();
  });

  // Root endpoint
  /**
   * @openapi
   * /:
   *   get:
   *     summary: Root endpoint
   *     description: Returns a greeting message
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   */
  app.get("/", (req: Request, res: Response) => {
    res.json({
      message: "API Server is running",
      environment: serverConfig.environment,
      docs: `/docs`,
      apiSpec: `/api/swagger.json`,
    });
  });

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Returns the health status of the API
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 environment:
   *                   type: string
   *                   example: local
   *                 version:
   *                   type: string
   *                   example: 1.0.0
   */
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      environment: serverConfig.environment,
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  // Serve Swagger UI at /docs path
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      // Custom Swagger UI configuration
      swaggerOptions: {
        // Only show resource tags in UI, filtering out version tags
        tagsSorter: "alpha", // Sort tags alphabetically
        operationsSorter: "alpha", // Sort operations alphabetically
        docExpansion: "list", // Expand/collapse tag groups
      },
    })
  );

  app.get("/api/swagger.json", (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  defineRoutes(app, container);

  // Register error handler AFTER all routes
  app.use(errorHandler);

  return app;
}
