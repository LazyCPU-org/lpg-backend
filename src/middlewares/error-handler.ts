import { Request, Response, NextFunction } from "express";

// Define an interface for custom errors
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Express error handler middleware
 * The function signature must match exactly what Express expects
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip formatting for Swagger routes
  const isSwaggerRoute = req.url.match(
    /^(\/docs|\/swagger-ui.*|\/api\/swagger.json)/
  );

  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || "Internal Server Error";

  console.error(`[Error] ${req.method} ${req.path}: ${errorMessage}`, err);

  // For Swagger routes, just return the error directly
  if (isSwaggerRoute) {
    res.status(statusCode).json({
      message: errorMessage,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  } else {
    // For API routes, return the error message directly
    // The response formatter middleware will handle wrapping it in the standardized format
    res.status(statusCode).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  // No return statement - this is important for Express error handler type compatibility
};
