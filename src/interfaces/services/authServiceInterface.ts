import { PreRegistrationRequest, RegisterRequest } from "../../dtos/authDTO";
import { Auth, PreRegistration } from "../models/authInterface";
import { SafeUser } from "../models/userInterface";

export interface AuthServiceInterface {
  verifyLoginCredentials(email: string, password: string): Promise<SafeUser>;

  loginUser(user: SafeUser): Promise<Auth | null>;

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
