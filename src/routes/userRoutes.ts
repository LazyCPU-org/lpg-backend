import express, { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authorization";
import { asyncHandler } from "../middlewares/async-handler";
import {
  isAuthenticated,
  requirePermission,
} from "../middlewares/authorization";
import { ActionEnum, ModuleEnum } from "../utils/permissions";
import { IUserService } from "../services/userService";

export function buildUserRouter(userService: IUserService) {
  const router = express.Router();

  /**
   * @openapi
   * /users/me:
   *   get:
   *     tags: [Users]
   *     summary: Returns the basic user data using the auth token
   *     description: Retrieves data from oneself
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: A registered user
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Auth'
   *
   */
  router.get(
    "/me",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.READ),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = parseInt(req.user?.id || "0", 10);
      const users = await userService.getCurrentUser(
        userId,
        req.user?.role || ""
      );

      res.json(users);
    })
  );

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get user by ID
   *     description: Retrieves a specific user by their ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: The user ID
   *     responses:
   *       200:
   *         description: Specific user details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       404:
   *         description: User not found
   */
  router.get(
    "/:id",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const user = await userService.getUserById(id);

      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    })
  );

  /**
   * @openapi
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create a new user
   *     description: Add a new user to the system
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - role
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid request body
   */
  router.post(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    asyncHandler(async (req: Request, res: Response) => {
      const { name, email, role } = req.body;

      // Example logic - would be replaced with actual database insert
      res.status(201).json({ id: 3, name, email, role });
    })
  );

  router.get(
    "/",
    isAuthenticated,
    requirePermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const authUserRole = req.user?.role || "";
      const users = await userService.getUsers(authUserRole);
      res.json(users);
    })
  );

  return router;
}
