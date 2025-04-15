import express, { Request, Response } from "express";
import { AuthServiceInterface } from "../interfaces/authServiceInterface";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RegisterRequest,
} from "../dtos/authDTO";
import { UserRoleEnum } from "../config/roles";

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
  router.post("/login/:role", async (req: Request, res: Response) => {
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
    } catch (error) {
      res.status(400).json({ message: "Invalid request body", error });
    }
  });

  /**
   * @openapi
   * /auth/register/{role}:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user by his role
   *     description: Registers a new user in the system
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
   */
  router.post("/register/:role", async (req: Request, res: Response) => {
    try {
      const registerRequest: RegisterRequest = RegisterRequestSchema.parse(
        req.body
      );
      const roleParam = req.params[
        "role"
      ] as (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
      const role =
        Object.values(UserRoleEnum).includes(roleParam) &&
        roleParam != UserRoleEnum.SUPERADMIN
          ? roleParam
          : UserRoleEnum.DELIVERY; // Defining login role as "delivery" by default

      const auth = await authService.registerByRole(registerRequest, role);
      res.status(201).json({ message: "Successful register", auth });
    } catch (error: any) {
      res
        .status(400)
        .json({ message: "Invalid request", error: error.message });
    }
  });

  return router;
}
