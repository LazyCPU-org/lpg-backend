import { Auth } from "../../dtos/response/authInterface";
import { SafeUser } from "../../dtos/response/userInterface";

export interface LoginStrategy {
  login(user: SafeUser): Promise<Auth | null>;
}
