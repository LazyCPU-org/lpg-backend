import { Auth } from "../../interfaces/models/authInterface";
import { SafeUser } from "../../interfaces/models/userInterface";

export interface LoginStrategy {
  login(user: SafeUser): Promise<Auth | null>;
}
