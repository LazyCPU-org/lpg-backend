import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger";
import { defineRoutes } from "./src/routes";
import { createContainer } from "./src/config/di";
import {
  loadEnvironmentConfig,
  getServerConfig,
  validateEnv,
} from "./src/utils/config";
import { AppError, errorHandler } from "./src/middlewares/error-handler";
import { responseFormatter } from "./src/middlewares/response-formatter";

export function createApp() {
  // Load environment configuration
  loadEnvironmentConfig();

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

  // CORS setup with specific allowed origins for security
  const allowedOrigins = [
    // Frontend URLs
    "http://localhost:5173", // Local development frontend URL
    "http://localhost:5000", // Local development docs
  ];

  // For GitHub Actions deployment, you might want to use environment variables
  // const allowedOrigins = process.env.NODE_ENV === 'production'
  //   ? ['https://test.app']
  //   : ['http://localhost:5173'];

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
          const msg =
            "The CORS policy for this site does not allow access from the specified Origin.";
          return callback(new Error(msg), false);
        }

        return callback(null, true);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip logging for Swagger UI and docs routes
    if (req.url.match(/^(\/docs|\/swagger-ui.*|\/favicon.*)/)) {
      return next();
    }

    const timestamp = new Date().toISOString();
    res.on("finish", () => {
      console.log(
        `[${timestamp}] ${req.method} ${req.baseUrl}${req.url} - HTTP ${res.statusCode}`
      );
    });
    next();
  });

  // Apply response formatter middleware BEFORE routes but AFTER other middleware
  // Skip for Swagger docs
  app.use((req, res, next) => {
    if (
      req.url.match(/^(\/docs|\/swagger-ui.*|\/api\/swagger.json|\/favicon.*)/)
    ) {
      return next();
    }
    responseFormatter(req, res, next);
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

  // Root routes definition
  defineRoutes(app, container);

  // Register error handler AFTER all routes
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.log("err!!", err);
    const appError = err as AppError;
    errorHandler(appError, req, res, next);
  });

  return app;
}
