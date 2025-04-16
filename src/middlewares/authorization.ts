import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ModuleEnum, ActionEnum, createPermission } from "../utils/permissions";

// Define the extended Request type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Middleware to verify JWT token and attach user data to request
 */
export const isAuthenticated = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        status: 401,
        message: "Authentication required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secretKey);

    // Attach user data to request
    req.user = decoded as any;
    next();
  } catch (error) {
    res.status(401).json({
      status: 401,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Check if user has a specific permission
 * @param requiredPermission The permission to check (format: "module:action")
 */
export const hasPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 401,
        message: "Authentication required",
      });
      return;
    }

    const userPermissions = req.user.permissions || [];

    // Check for wildcard permission
    if (userPermissions.includes("*")) {
      next();
      return;
    }

    // Check if user has the exact permission
    if (userPermissions.includes(requiredPermission)) {
      next();
      return;
    }

    // Check for wildcard module permissions
    const [module, action] = requiredPermission.split(":");
    if (userPermissions.includes(`${module}:*`)) {
      next();
      return;
    }

    // Check for wildcard action permissions
    if (userPermissions.includes(`*:${action}`)) {
      next();
      return;
    }

    // Check if user has MANAGE permission which implies all CRUD
    if (action !== "manage" && userPermissions.includes(`${module}:manage`)) {
      next();
      return;
    }

    res.status(403).json({
      status: 403,
      message: "Permission denied",
      required: requiredPermission,
    });
  };
};

/**
 * Check if user has ANY of the required permissions
 * @param permissions Array of permissions to check (at least one must match)
 */
export const hasAnyPermission = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 401,
        message: "Authentication required",
      });
      return;
    }

    // Check for wildcard permission
    if (req.user.permissions.includes("*")) {
      next();
      return;
    }

    // Check if user has any of the required permissions
    for (const permission of permissions) {
      const middleware = hasPermission(permission);

      // Create a mock response to check if the permission passes
      const mockRes: any = {
        status: () => ({ json: () => {} }),
      };

      let hasAccess = false;
      const mockNext = () => {
        hasAccess = true;
      };

      middleware(req, mockRes as Response, mockNext);

      if (hasAccess) {
        next();
        return;
      }
    }

    res.status(403).json({
      status: 403,
      message: "Permission denied",
      required: { any: permissions },
    });
  };
};

/**
 * Check if user has ALL of the required permissions
 * @param permissions Array of permissions to check (all must match)
 */
export const hasAllPermissions = (permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 401,
        message: "Authentication required",
      });
      return;
    }

    // Check for wildcard permission
    if (req.user.permissions.includes("*")) {
      next();
      return;
    }

    // Check if user has all required permissions
    for (const permission of permissions) {
      const middleware = hasPermission(permission);

      // Create a mock response to check if the permission passes
      const mockRes: any = {
        status: () => ({ json: () => {} }),
      };

      let hasAccess = false;
      const mockNext = () => {
        hasAccess = true;
      };

      middleware(req, mockRes as Response, mockNext);

      if (!hasAccess) {
        res.status(403).json({
          status: 403,
          message: "Permission denied",
          required: { all: permissions },
        });
        return;
      }
    }

    next();
  };
};

/**
 * Convenient middleware for module-based permissions
 */
export const requirePermission = (module: ModuleEnum, action: ActionEnum) => {
  return hasPermission(createPermission(module, action));
};
