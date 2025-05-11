/**
 * Interface for application custom errors
 */
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Interface for formatted validation errors
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  validation?: string;
}

/**
 * Interface for structured error responses
 */
export interface ErrorResponse {
  type?: string;
  message?: string;
  errors?: ValidationErrorDetail[];
  stack?: string[];
}
