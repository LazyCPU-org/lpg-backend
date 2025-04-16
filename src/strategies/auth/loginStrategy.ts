import { Auth } from "../../interfaces/models/authInterface";

export interface LoginStrategy {
  login(email: string, password: string): Promise<Auth | null>;
}
