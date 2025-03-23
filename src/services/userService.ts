import { User } from "../interfaces/userInterface";
import {
  UserRepository,
  InMemoryUserRepository,
} from "../repositories/userRepository";

export class UserService {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.getUsers();
  }

  async getUserById(id: number): Promise<User | null> {
    return this.userRepository.getUserById(id);
  }
}

// Example usage:
const userRepository = new InMemoryUserRepository();
const userService = new UserService(userRepository);
