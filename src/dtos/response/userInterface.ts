import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { UserRoleEnum } from "../../config/roles";
import { superadmins, userProfiles, users } from "../../db/schemas";

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
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;

// Generic User Zod schemas
export const insertUserSchema = createInsertSchema(users, {
  role: z.enum([
    UserRoleEnum.SUPERADMIN,
    UserRoleEnum.ADMIN,
    UserRoleEnum.OPERATOR,
    UserRoleEnum.DELIVERY,
  ]),
});

export const selectUserSchema = createSelectSchema(users, {
  role: z.enum([
    UserRoleEnum.SUPERADMIN,
    UserRoleEnum.ADMIN,
    UserRoleEnum.OPERATOR,
    UserRoleEnum.DELIVERY,
  ]),
});

// Create safe generic schema for users
export type SafeUser = z.infer<typeof selectSafeUserSchema>;
export const selectSafeUserSchema = createSelectSchema(users, {
  role: z.enum([
    UserRoleEnum.SUPERADMIN,
    UserRoleEnum.ADMIN,
    UserRoleEnum.OPERATOR,
    UserRoleEnum.DELIVERY,
  ]),
}).omit({
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

// Create Zod schemas for validation
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const selectUserProfileSchema = createSelectSchema(userProfiles);

export type UserProfile = z.infer<typeof selectUserProfileSchema>;
export type NewUserProfile = z.infer<typeof insertUserProfileSchema>;

export const selectSafeUserWithRelationsSchema = selectSafeUserSchema.extend({
  userProfile: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
    })
    .optional()
    .nullable(),
});

export type SafeUserWithRelations = z.infer<
  typeof selectSafeUserWithRelationsSchema
>;

// SudoAdmin Zod schemas
export const insertSudoAdminSchema = createInsertSchema(superadmins);
export const selectSudoAdminSchema = createSelectSchema(superadmins);

export type SudoAdmin = z.infer<typeof selectSudoAdminSchema>;
export type NewSudoAdmin = z.infer<typeof insertSudoAdminSchema>;
