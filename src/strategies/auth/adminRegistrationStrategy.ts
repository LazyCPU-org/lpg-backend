import { RegisterRequest } from "../../dtos/authDTO";
import { Auth } from "../../interfaces/authInterface";
import { AuthRepository } from "../../repositories/authRepository";
import { UserRoleEnum } from "../../config/roles";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegistrationStrategy } from "./registrationStrategy";
import { PermissionSets } from "../../utils/permissions";
import { BadRequestError } from "../../utils/custom-errors";

export class AdminRegistrationStrategy implements RegistrationStrategy {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  async register(registerRequest: RegisterRequest): Promise<Auth> {
    // Hash password with strong encryption for admin users
    const hashedPassword = await bcrypt.hash(registerRequest.password, 12);

    // Update the request with hashed password
    const secureRequest = {
      ...registerRequest,
      password: hashedPassword,
    };

    // Register the user
    const user = await this.authRepository.registerByRole(
      secureRequest,
      UserRoleEnum.ADMIN
    );

    if (!user?.id)
      throw new BadRequestError("Unable to register user, try again later");

    // Set default permissions for new admin
    const defaultPermissions = PermissionSets.ADMIN_PERMISSIONS;

    // Create admin entry with default permissions
    const admin = await this.authRepository.createAdmin({
      userId: user.id,
      permissions: defaultPermissions,
    });

    // Create JWT payload with permissions
    const payload = {
      id: admin.adminId,
      userId: user.id,
      role: UserRoleEnum.ADMIN,
      permissions: defaultPermissions,
    };

    // Sign the token
    const secretKey = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign(payload, secretKey, { expiresIn: "30min" });

    // Return auth object with token
    return {
      id: user.id,
      email: user.email,
      token,
    } as Auth;
  }
}
