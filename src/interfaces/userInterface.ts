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
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email used for identification
 *         passwordHash:
 *           type: string
 *           description: The user's password hash
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

export interface User {
  userId: number;
  email: string;
  passwordHash: string;
}
