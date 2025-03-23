import { Auth } from "../../interfaces/authInterface";

export interface LoginStrategy {
  login(email: string, password: string): Promise<Auth | null>;
}
