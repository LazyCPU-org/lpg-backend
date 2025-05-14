import { Auth } from "../models/authInterface";
import { SafeUser } from "../models/userInterface";

export interface UserServiceInterface {
  getUsers(userRole: string): Promise<SafeUser[]>;

  getUserById(id: number): Promise<SafeUser>;

  getCurrentUser(id: number, role: string): Promise<Auth>;
}
