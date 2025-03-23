import { User } from "../interfaces/userInterface";

export interface UserRepository {
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
}

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [
    { id: 1, email: "john@example.com" },
    { id: 2, email: "jane@example.com" },
  ];

  async getUsers(): Promise<User[]> {
    return this.users;
  }

  async getUserById(id: number): Promise<User | null> {
    const user = this.users.find((user) => user.id === id);
    return user || null;
  }
}
