import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/models/authInterface";
import { UserRoleEnum } from "../../config/roles";

export interface RegistrationStrategy {
  register(registerRequest: RegisterRequest): Promise<Auth>;
}
