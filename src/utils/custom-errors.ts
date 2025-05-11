export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // This captures the stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Create specific HTTP error classes for common status codes
export class BadRequestError extends HttpError {
  constructor(message: string = "Bad Request") {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "Not Found") {
    super(message, 404);
  }
}

export class ExpirationError extends HttpError {
  constructor(message: string = "Token invalid or expired") {
    super(message, 404);
  }
}

export class InternalError extends HttpError {
  constructor(message: string = "Internal Server Error") {
    super(message, 500);
  }
}
