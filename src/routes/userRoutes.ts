import express, { Request, Response } from "express";
import { UserService } from "../services/userService";
import { InMemoryUserRepository } from "../repositories/userRepository";

const router = express.Router();
const userRepository = new InMemoryUserRepository();
const userService = new UserService(userRepository);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Returns a list of users
 *     description: Retrieves all registered users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get("/", async (req: Request, res: Response) => {
  const users = await userService.getUsers();
  res.json(users);
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieves a specific user by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = await userService.getUserById(id);

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

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
router.post("/", (req: Request, res: Response) => {
  const { name, email } = req.body;

  // Example logic - would be replaced with actual database insert
  res.status(201).json({ id: 3, name, email });
});

export default router;
