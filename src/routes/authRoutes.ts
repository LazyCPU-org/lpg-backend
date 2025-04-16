import express, { Request, Response } from "express";
import { AuthServiceInterface } from "../interfaces/authServiceInterface";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RegisterRequest,
} from "../dtos/authDTO";
import { UserRoleEnum } from "../config/roles";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { ModuleEnum, ActionEnum } from "../utils/permissions";

export function createAuthRouter(authService: AuthServiceInterface) {
  const router = express.Router();

  /**
   * @openapi
   * /auth/login/{role}:
   *   post:
   *     tags: [Auth]
   *     summary: Login admin
   *     description: Logs in an existing admin
   *     parameters:
   *       - in: path
   *         name: role
   *         schema:
   *           type: string
   *           enum: [delivery, operator, admin, superadmin]
   *           default: delivery
   *         required: true
   *         description: Role used to login into the system
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Successful login
   *       401:
   *         description: Invalid credentials
   */
  router.post(
    "/login/:role",
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const loginRequest = LoginRequestSchema.parse(req.body);
        const roleParam = req.params[
          "role"
        ] as (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
        const role = Object.values(UserRoleEnum).includes(roleParam)
          ? roleParam
          : UserRoleEnum.DELIVERY; // Defining login role as "delivery" by default

        const auth = await authService.loginByRole(
          loginRequest.email,
          loginRequest.password,
          role
        );
        if (auth) {
          res.status(200).json({ message: "Successful login", auth });
        } else {
          res.status(401).json({ message: "Invalid credentials" });
        }
      } catch (error: any) {
        res
          .status(error.status || 400)
          .json({ message: "Invalid request", err: error.message });
      }
    })
  );

  /**
   * @openapi
   * /auth/register/{role}:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user by his role
   *     description: Registers a new user in the system
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: role
   *         schema:
   *           type: string
   *           enum: [delivery, operator, admin, superadmin]
   *           default: delivery
   *         required: true
   *         description: Role used to register into the system
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       201:
   *         description: Successful register
   *       400:
   *         description: Invalid request body
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    "/register/:role",
    isAuthenticated, // Require authentication
    requirePermission(ModuleEnum.USERS, ActionEnum.CREATE), // Require user creation permission
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const registerRequest: RegisterRequest = RegisterRequestSchema.parse(
          req.body
        );
        const roleParam = req.params[
          "role"
        ] as (typeof UserRoleEnum)[keyof typeof UserRoleEnum];

        // Only allow registering superadmins if requester has special permission
        if (roleParam === UserRoleEnum.SUPERADMIN) {
          // Cast req to AuthRequest to access user property
          const authReq = req as any;
          const hasManageSuperadminPerm = (
            authReq.user?.permissions || []
          ).some(
            (perm: string) =>
              perm === "*" ||
              perm === "superadmins:create" ||
              perm === "superadmins:manage"
          );

          if (!hasManageSuperadminPerm) {
            return res.status(403).json({
              message: "Permission denied",
              required: "superadmins:create",
            });
          }
        }

        const role = Object.values(UserRoleEnum).includes(roleParam)
          ? roleParam
          : UserRoleEnum.DELIVERY; // Defining login role as "delivery" by default

        const auth = await authService.registerByRole(registerRequest, role);
        res.status(201).json({ message: "Successful register", auth });
      } catch (error: any) {
        res
          .status(400)
          .json({ message: "Invalid request", error: error.message });
      }
    })
  );

  // Add a route to manage permissions - requires special access
  /**
   * @openapi
   * /auth/permissions/{userId}:
   *   put:
   *     tags: [Auth]
   *     summary: Update user permissions
   *     description: Updates permissions for a specific user
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: integer
   *         required: true
   *         description: User ID to update permissions for
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - permissions
   *             properties:
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["users:read", "finances:read"]
   *     responses:
   *       200:
   *         description: Permissions updated successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.put(
    "/permissions/:userId",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
          return res.status(400).json({
            message: "Invalid request",
            error: "Permissions must be an array of strings",
          });
        }

        // This would be injected from the container when it's set up
        const permissionManager = (req as any).container.permissionManager;

        await permissionManager.setPermissions(userId, permissions);

        res.status(200).json({
          message: "Permissions updated successfully",
          userId,
          permissions,
        });
      } catch (error: any) {
        res.status(400).json({
          message: "Failed to update permissions",
          error: error.message,
        });
      }
    })
  );

  return router;
}
