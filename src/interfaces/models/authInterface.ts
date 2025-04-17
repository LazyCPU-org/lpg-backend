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
 *           format: email
 *           description: The user's JWT Token for authentication/authorization
 *         current_role:
 *           type: string
 *           description: The user's role (superadmin, admin, operator, delivery)
 */

export interface Auth {
  id?: number;
  email: string;
  passwordHash?: string;
  token?: string;
  current_role?: string;
}
