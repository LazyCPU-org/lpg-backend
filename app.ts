import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./src/config/swagger";
import { defineRoutes } from "./src/routes";
import { createContainer } from "./src/config/di";

export function createApp() {
  const app = express();
  const port: number = Number(process.env.PORT) || 5000;

  // Create the dependency container
  const container = createContainer();

  // Middleware
  app.use(express.json());

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
      docs: `/docs`,
      apiSpec: `/api/swagger.json`,
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
        // Hide version tags by using filter function if needed
        // filter: (tagObj, operationObj) => {
        //   // Filter out v1, v2, etc. tags from the UI
        //   return !tagObj.name.match(/^v\d+$/);
        // }
      },
    })
  );

  app.get("/api/swagger.json", (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  defineRoutes(app, container);

  return app;
}
