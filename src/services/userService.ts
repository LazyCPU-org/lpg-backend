import { UserServiceInterface } from "../interfaces/services/userServiceInterface";
import { User } from "../interfaces/models/userInterface";
import { UserRepository } from "../repositories/userRepository";
import { NotFoundError, UnauthorizedError } from "../utils/custom-errors";
import { Auth } from "../interfaces/models/authInterface";

export class UserService implements UserServiceInterface {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  // Method used to retrieve user's own information
  async getCurrentUser(id: number, role: string): Promise<Auth | null> {
    const user = await this.userRepository.getUserById(id);
    if (!user) throw new NotFoundError();
    if (user.role != role) throw new UnauthorizedError();
    return {
      id: user.userId,
      name: user.name,
      email: user.email,
      user_role: user.role,
      permissions: user.permissions,
    };
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.getUsers();
  }

  async getUserById(id: number): Promise<User | null> {
    return this.userRepository.getUserById(id);
  }
}
