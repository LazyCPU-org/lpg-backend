import { UserServiceInterface } from "../interfaces/services/userServiceInterface";
import { User } from "../interfaces/models/userInterface";
import { UserRepository } from "../repositories/userRepository";

export class UserService implements UserServiceInterface {
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
