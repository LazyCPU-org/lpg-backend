// src/middlewares/error-handler.ts
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { HttpError } from "../utils/custom-errors"; // Import your custom error class

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  if (err instanceof HttpError) {
    res.status(err.status).json({
      message: err.message || "Error occurred",
      err: err.message,
    });
    return; // Just return, don't return the response object
  }

  // Handle zod validation errors if you're using zod
  if (err instanceof Error && err.name === "ZodError") {
    res.status(400).json({
      message: "Validation error",
      err: err.message,
    });
    return;
  }

  // Default error handler for unhandled errors
  res.status(500).json({
    message: "Internal Server Error",
    err:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err instanceof Error
        ? err.message
        : String(err),
  });
  // No return statement here either
};
