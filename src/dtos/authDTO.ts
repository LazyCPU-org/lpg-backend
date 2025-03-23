import { z } from "zod";
import { UserRoleEnum } from "../config/roles";

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z
    .enum([UserRoleEnum.ADMIN, UserRoleEnum.OPERATOR, UserRoleEnum.DELIVERY])
    .default(UserRoleEnum.DELIVERY),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
