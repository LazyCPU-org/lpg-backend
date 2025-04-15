import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginStrategy } from "./loginStrategy";
import { User, type SudoAdmin } from "../../interfaces/userInterface";
import { NotFoundError, UnauthorizedError } from "../../utils/custom-errors";

export class SuperadminLoginStrategy implements LoginStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async login(email: string, password: string): Promise<Auth | null> {
    // Admin-specific login logic
    const user: User | null = await this.authRepository.findUserByRole(
      email,
      UserRoleEnum.SUPERADMIN
    );
    if (!user) throw new NotFoundError();

    const comparePassword = await bcrypt.compare(password, user.passwordHash);
    if (!comparePassword)
      throw new UnauthorizedError("Invalid provided credentials");

    // Admin-specific validation can be added here

    const sudoAdmin: SudoAdmin | null =
      await this.authRepository.findSudoAdminByUserId(user.userId);
    if (!sudoAdmin) throw new NotFoundError();

    const payload = {
      id: sudoAdmin.sudoadminId,
      role: UserRoleEnum.SUPERADMIN,
      permissions: [...sudoAdmin.accessLevel],
    };

    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "30min" });

    return {
      id: user.userId,
      email: user.email,
      token,
    } as Auth;
  }
}
