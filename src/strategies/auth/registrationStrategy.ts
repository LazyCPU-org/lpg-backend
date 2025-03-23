import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/authInterface";
import { UserRoleEnum } from "../../config/roles";

export interface RegistrationStrategy {
  register(registerRequest: RegisterRequest): Promise<Auth>;
}
