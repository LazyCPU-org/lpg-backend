import { PreRegistrationRequest, RegisterRequest } from "../../dtos/authDTO";
import { Auth, PreRegistration } from "../models/authInterface";

export interface AuthServiceInterface {
  loginByRole(
    email: string,
    password: string,
    role: string
  ): Promise<Auth | null>; // Replace 'any' with a more specific type if available

  // New methods for token-based registration
  createRegistrationToken(
    userData: PreRegistrationRequest,
    createdBy: number,
    expiresInHours?: number
  ): Promise<PreRegistration>;

  verifyRegistrationToken(token: string): Promise<PreRegistration>;

  completeTokenRegistration(
    token: string,
    preRegistrationData: PreRegistration,
    registerRequest: RegisterRequest
  ): Promise<Auth>;
}
