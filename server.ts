import { createApp } from "./app";
import { getServerConfig } from "./src/utils/config";

// Create the application
const app = createApp();

// Get configuration
const serverConfig = getServerConfig();
const port = serverConfig.port;

// Start server
app.listen(port, () => {
  console.log(
    `Server running in ${serverConfig.environment} environment (${serverConfig.nodeEnv} mode)`
  );
  console.log(`Server listening on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/docs`
  );
  console.log(`Health check available at http://localhost:${port}/health`);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
