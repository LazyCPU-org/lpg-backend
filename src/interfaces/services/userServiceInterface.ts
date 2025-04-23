import { Auth } from "../models/authInterface";
import { User } from "../models/userInterface";

export interface UserServiceInterface {
  getUsers(): Promise<User[] | null>;

  getUserById(id: number): Promise<User | null>;

  getCurrentUser(id: number, role: string): Promise<Auth | null>;
}
