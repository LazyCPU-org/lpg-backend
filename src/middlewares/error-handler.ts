import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "./types";

/**
 * Parses ZodError objects into a more readable format
 */
const formatZodError = (error: ZodError) => {
  return {
    type: "ValidationError",
    message: "Validation failed",
    errors: error.errors.map((err) => ({
      field: err.path.length > 0 ? err.path.join(".") : "unknown",
      message: err.message,
      code: err.code,
    })),
  };
};

/**
 * Express error handler middleware
 * The function signature must match exactly what Express expects
 */
export const errorHandler = (
  err: Error | ZodError | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip formatting for Swagger routes
  const isSwaggerRoute = req.url.match(
    /^(\/docs|\/swagger-ui.*|\/api\/swagger.json)/
  );

  // Default values
  let statusCode = 500;
  let errorResponse: any = {
    message: err.message || "Internal Server Error",
  };

  // Check if it's a Zod validation error
  if (err instanceof ZodError) {
    statusCode = 400; // Bad Request for validation errors
    errorResponse = formatZodError(err);
  }
  // Check if it's our custom AppError type
  else if ("statusCode" in err) {
    statusCode = err.statusCode || 500;
  }

  // Add formatted stack trace in development environment
  if (process.env.NODE_ENV === "development" && err.stack) {
    // Convert the stack trace string to an array of stack frames
    const stackLines = err.stack.split("\n").slice(1); // Skip the first line which is the error message
    errorResponse.stack = stackLines.map((line) => {
      // Clean up each line and extract the key information
      line = line.trim();
      if (line.startsWith("at ")) {
        line = line.substring(3);
      }
      return line;
    });
  }

  console.error(`[Error] ${req.method} ${req.path}: ${errorResponse.message}`);

  /// For Swagger routes, just return the error directly
  if (isSwaggerRoute) {
    res.status(statusCode).json({
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  } else {
    // For API routes, return structured error response
    res.status(statusCode).json({
      data: null,
      error: errorResponse,
    });
  }

  // No return statement - this is important for Express error handler type compatibility
};
