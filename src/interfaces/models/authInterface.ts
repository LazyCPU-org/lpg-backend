/**
 * @openapi
 * components:
 *   schemas:
 *     Auth:
 *       type: object
 *       properties:
 *         email:
 *           type: integer
 *           description: The auto-generated id of the user
 *         token:
 *           type: string
 *           description: The user's JWT Token for authentication/authorization
 *         user_role:
 *           type: string
 *           description: The user's role (superadmin, admin, operator, delivery)
 *         permissions:
 *           type: array
 *           descriptions: A list of defined roles for a given user within the system
 *           items:
 *             type: string
 *
 */

export interface Auth {
  id?: number;
  email: string;
  token?: string;
  user_role?: string;
  permissions: string[];
}
