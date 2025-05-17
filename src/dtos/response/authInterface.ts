/**
 * @openapi
 * components:
 *   schemas:
 *     Auth:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The name defined for the user
 *         email:
 *           type: string
 *           format: email
 *           description: The email associated with the user
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

import { UserRoleEnum } from "../../config/roles";

export interface Auth {
  id?: number;
  name: string;
  email: string;
  token?: string;
  user_role?: string;
  permissions: string[];
}

export interface PreRegistration {
  email: string;
  name: string;
  role: (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
  token?: string;
}
