import { AuthRepository } from "../repositories/authRepository";
import { UserRepository } from "../repositories/userRepository";

export class PermissionManager {
  private authRepository: AuthRepository;
  private userRepository: UserRepository;

  constructor(authRepository: AuthRepository, userRepository: UserRepository) {
    this.authRepository = authRepository;
    this.userRepository = userRepository;
  }

  /**
   * Grant specific permissions to a user
   * @param userId User ID
   * @param permissions Array of permission strings
   */
  async grantPermissions(userId: number, permissions: string[]): Promise<void> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get the user's role-specific record (admin, superadmin, etc.)
    const roleRecord = await this.getRoleRecordByUserId(userId, user.role);
    if (!roleRecord) {
      throw new Error(`Role record for user ${userId} not found`);
    }

    // Get current permissions
    let currentPermissions: string[] = [];
    try {
      currentPermissions = JSON.parse(roleRecord.permissions || "[]");
    } catch (e) {
      currentPermissions = [];
    }

    // Add new permissions without duplicates
    const uniquePermissions = [
      ...new Set([...currentPermissions, ...permissions]),
    ];

    // Update permissions in the database
    await this.updatePermissions(userId, user.role, uniquePermissions);
  }

  /**
   * Revoke specific permissions from a user
   * @param userId User ID
   * @param permissions Array of permission strings to revoke
   */
  async revokePermissions(
    userId: number,
    permissions: string[]
  ): Promise<void> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Get the user's role-specific record
    const roleRecord = await this.getRoleRecordByUserId(userId, user.role);
    if (!roleRecord) {
      throw new Error(`Role record for user ${userId} not found`);
    }

    // Get current permissions
    let currentPermissions: string[] = [];
    try {
      currentPermissions = JSON.parse(roleRecord.permissions || "[]");
    } catch (e) {
      currentPermissions = [];
    }

    // Remove specified permissions
    const updatedPermissions = currentPermissions.filter(
      (perm) => !permissions.includes(perm)
    );

    // Update permissions in the database
    await this.updatePermissions(userId, user.role, updatedPermissions);
  }

  /**
   * Set permissions for a user (replaces all existing permissions)
   * @param userId User ID
   * @param permissions Array of permission strings
   */
  async setPermissions(userId: number, permissions: string[]): Promise<void> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Update permissions in the database
    await this.updatePermissions(userId, user.role, permissions);
  }

  /**
   * Check if a user has a specific permission
   * @param userId User ID
   * @param permission Permission string to check
   */
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      return false;
    }

    // Get the user's role-specific record
    const roleRecord = await this.getRoleRecordByUserId(userId, user.role);
    if (!roleRecord) {
      return false;
    }

    // Get current permissions
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(roleRecord.permissions || "[]");
    } catch (e) {
      permissions = [];
    }

    // Check for wildcard
    if (permissions.includes("*")) {
      return true;
    }

    // Check for exact permission
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for module wildcard
    const [module, action] = permission.split(":");
    if (permissions.includes(`${module}:*`)) {
      return true;
    }

    // Check for action wildcard
    if (permissions.includes(`*:${action}`)) {
      return true;
    }

    // Check for MANAGE permission which implies all CRUD
    if (action !== "manage" && permissions.includes(`${module}:manage`)) {
      return true;
    }

    return false;
  }

  /**
   * Helper to get the role-specific record (admin, superadmin, etc.)
   * @private
   */
  private async getRoleRecordByUserId(userId: number, role: string) {
    switch (role) {
      case "superadmin":
        return this.authRepository.findSudoAdminByUserId(userId);
      case "admin":
        return this.authRepository.findAdminByUserId(userId);
      // Add other roles as needed
      default:
        return null;
    }
  }

  /**
   * Helper to update permissions in the database
   * @private
   */
  private async updatePermissions(
    userId: number,
    role: string,
    permissions: string[]
  ): Promise<void> {
    await this.authRepository.updateUserPermissions(userId, permissions);
  }
}
