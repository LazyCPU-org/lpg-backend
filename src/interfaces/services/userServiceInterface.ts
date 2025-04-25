import { Auth } from "../models/authInterface";
import { SafeUser, User } from "../models/userInterface";

export interface UserServiceInterface {
  getUsers(): Promise<SafeUser[] | null>;

  getUserById(id: number): Promise<User | null>;

  getCurrentUser(id: number, role: string): Promise<Auth | null>;
}
