import { NextFunction, Request, Response } from "express";

/**
 * Interface for relation options that will be attached to the request
 * @example
 * // Simple format: ?include=users,inventory
 * req.includeRelations = { users: true, inventory: true }
 */
export interface RelationOptions {
  [key: string]: boolean | object;
}

declare global {
  namespace Express {
    interface Request {
      includeRelations?: RelationOptions;
      user?: {
        id: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

/**
 * Middleware to parse include query parameter for API relation loading
 *
 * Supported formats:
 * 1. Comma-separated: `?include=users,inventory`
 * 2. JSON: `?include={"users":true,"inventory":true}`
 *
 * @param req Express request
 * @param res Express response
 * @param next Next middleware function
 */
export function parseIncludeRelations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const include = req.query.include as string;

  if (!include) {
    req.includeRelations = {};
    return next();
  }

  try {
    // Handle JSON format
    if (include.startsWith("{")) {
      req.includeRelations = JSON.parse(include);
    }
    // Handle comma-separated format
    else {
      const relations = include.split(",");
      req.includeRelations = relations.reduce((acc, rel) => {
        acc[rel.trim()] = true;
        return acc;
      }, {} as RelationOptions);
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Invalid include parameter format",
      message:
        'Use either comma-separated values like "users,inventory" or JSON format {"users":true,"inventory":true}',
    });
  }
}
