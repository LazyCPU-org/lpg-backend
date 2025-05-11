import { z } from "zod";
import { UserRoleEnum } from "../config/roles";

// Pre-Registration model validation

export const PreRegistrationRequestSchema = z.object({
  email: z.string().nonempty().email("Email inválido"),
  name: z.string().nonempty(),
  role: z.nativeEnum(UserRoleEnum).default(UserRoleEnum.DELIVERY),
});

export type PreRegistrationRequest = z.infer<
  typeof PreRegistrationRequestSchema
>;

// Registration model validation

export const RegisterRequestSchema = z.object({
  phone_number: z.string(),
  last_name: z.string(),
  password: z
    .string()
    .nonempty()
    .min(6, "Password tiene que tener más de 5 carácteres"),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RegisterUserRequestSchema = PreRegistrationRequestSchema.merge(
  RegisterRequestSchema
);

// Model to handle all the information needed for Register Strategy
export type RegisterUserRequest = z.infer<typeof RegisterUserRequestSchema>;

// Login model validation

export const LoginRequestSchema = z.object({
  email: z.string().nonempty().email("Email inválido"),
  password: z.string().min(6, "Password tiene que tener más de 5 carácteres"),
  role: z.nativeEnum(UserRoleEnum).default(UserRoleEnum.DELIVERY),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
