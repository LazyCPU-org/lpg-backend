import { Auth } from "../models/authInterface";

export interface AuthServiceInterface {
  loginByRole(
    email: string,
    password: string,
    role: string
  ): Promise<Auth | null>; // Replace 'any' with a more specific type if available

  registerByRole(
    registerRequest: any, // Replace 'any' with a more specific type like RegisterRequest if available
    role: string
  ): Promise<Auth>; // Replace 'any' with a more specific type if available
}
