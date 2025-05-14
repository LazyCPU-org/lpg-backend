import express, { Request, Response } from "express";
import { AuthServiceInterface } from "../interfaces/services/authServiceInterface";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  PreRegistrationRequestSchema,
} from "../dtos/authDTO";
import { UserRoleEnum } from "../config/roles";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { ModuleEnum, ActionEnum } from "../utils/permissions";
import { BadRequestError } from "../utils/custom-errors";

export function buildAuthRouter(authService: AuthServiceInterface) {
  const router = express.Router();

  // Login routes

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login user
   *     description: Logs in an existing user
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
    "/login",
    asyncHandler(async (req: Request, res: Response) => {
      const loginRequest = LoginRequestSchema.parse(req.body);

      const safeUser = await authService.verifyLoginCredentials(
        loginRequest.email,
        loginRequest.password
      );

      const auth = await authService.loginUser(safeUser);
      res.status(200).json(auth);
    })
  );

  // Pre-register route

  /**
   * @openapi
   * /auth/preregistration:
   *   post:
   *     tags: [Auth]
   *     summary: Create a registration token for a new user
   *     description: Creates a temporary token for user self-registration
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - name
   *               - role
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               name:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [delivery, operator, admin]
   *     responses:
   *       201:
   *         description: Registration token created successfully
   *       400:
   *         description: Invalid request
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - insufficient permissions
   */
  router.post(
    "/preregistration",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.CREATE),
    asyncHandler(async (req: Request, res: Response) => {
      // Request body validation
      const preRegistrationData = PreRegistrationRequestSchema.parse(req.body);
      const authReq = req as any;
      const createdBy = authReq.user.id;

      // Avoid superadmin creation for now
      if (preRegistrationData.role === UserRoleEnum.SUPERADMIN) {
        throw new BadRequestError("Información inválida");
      }

      const registrationToken = await authService.createRegistrationToken(
        preRegistrationData,
        createdBy
      );

      res.status(201).json(registrationToken);
    })
  );

  // Register confirmation route

  /**
   * @openapi
   * /auth/verify-registration-token/{token}:
   *   get:
   *     tags: [Auth]
   *     summary: Verify a registration token and get prefilled data
   *     description: Verifies if a token is valid and returns user data to prefill the form
   *     parameters:
   *       - in: path
   *         name: token
   *         schema:
   *           type: string
   *         required: true
   *         description: Registration token
   *     responses:
   *       200:
   *         description: Token verified successfully
   *       400:
   *         description: Invalid or expired token
   */
  router.get(
    "/verify-registration-token/:token",
    asyncHandler(async (req: Request, res: Response) => {
      const { token } = req.params;

      const result = await authService.verifyRegistrationToken(token);

      res.status(200).json(result);
    })
  );

  /**
   * @openapi
   * /auth/complete-registration/{token}:
   *   post:
   *     tags: [Auth]
   *     summary: Complete user registration with a token
   *     description: Completes the registration process using a valid token
   *     parameters:
   *       - in: path
   *         name: token
   *         schema:
   *           type: string
   *         required: true
   *         description: Registration token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone_number
   *               - last_name
   *               - password
   *             properties:
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       201:
   *         description: Registration completed successfully
   *       400:
   *         description: Invalid token or request
   */
  router.post(
    "/complete-registration/:token",
    asyncHandler(async (req: Request, res: Response) => {
      const { token } = req.params;
      const registerRequest = RegisterRequestSchema.parse(req.body);

      if (!registerRequest.password) {
        throw new BadRequestError("Password es un campo obligatorio");
      }

      // Obtaining predefined information for completing register process
      const preRegistration = await authService.verifyRegistrationToken(token);

      const auth = await authService.completeTokenRegistration(
        token,
        preRegistration,
        registerRequest
      );

      if (!auth) {
        return res.status(400).json({
          message: "Failed to complete registration",
          error: "Token inválido o expirado",
        });
      }

      res.status(201).json(auth);
    })
  );

  // Permision management routes

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
