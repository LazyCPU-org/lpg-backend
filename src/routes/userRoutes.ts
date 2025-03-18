import express, { Request, Response } from "express";

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         userId:
 *           type: integer
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: The user's username
 *         passwordHash:
 *           type: string
 *           description: The user's password hash
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email
 *         role:
 *           type: string
 *           description: The user's role (admin, operator, delivery)
 *         isActive:
 *           type: boolean
 *           description: Whether the user is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the user was last updated
 */

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
router.get("/", (req: Request, res: Response) => {
  res.json([
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ]);
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
router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  // Example logic - would be replaced with actual database query
  if (id === 1) {
    res.json({ id: 1, name: "John Doe", email: "john@example.com" });
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
