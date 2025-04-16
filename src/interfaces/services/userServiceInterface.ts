import { User } from "../models/userInterface";

export interface UserServiceInterface {
  getUsers(): Promise<User[] | null>;

  getUserById(id: number): Promise<User | null>;
}
