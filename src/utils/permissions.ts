import { UserRoleEnum } from "../config/roles";
import { BadRequestError } from "./custom-errors";

// Define modules
export enum ModuleEnum {
  USERS = "users",
  PRODUCTS = "products",
  STORES = "stores",
  FINANCES = "finances",
  INVENTORY = "inventory",
  TRANSACTIONS = "transactions",
  ORDERS = "orders",
  SETTINGS = "settings",
  SUPERADMINS = "superadmins",
  REPORTS = "reports",
  DASHBOARD = "dashboard",
  // Add more as needed
}

// Define actions
export enum ActionEnum {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  MANAGE = "manage", // Special action that includes all CRUD operations
  ADMIN = "admin", // Administrative actions (admin-only operations)
  EXPORT = "export", // For reports export
  APPROVE = "approve", // For approving transactions, etc.
  SELFMANAGE = "selfmanage", // Action specific to manage data about oneself
  // Add more specific actions as needed
}

// Helper to generate permission strings
export const createPermission = (
  module: ModuleEnum,
  action: ActionEnum
): string => {
  return `${module}:${action}`;
};

// Define common permission sets
export const PermissionSets = {
  // Full access to everything
  SUPERADMIN_PERMISSIONS: ["*"],

  // Role-based permission sets
  ADMIN_PERMISSIONS: [
    createPermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    createPermission(ModuleEnum.STORES, ActionEnum.MANAGE),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.MANAGE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.MANAGE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.MANAGE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.ADMIN),
    createPermission(ModuleEnum.REPORTS, ActionEnum.READ),
    createPermission(ModuleEnum.REPORTS, ActionEnum.EXPORT),
    createPermission(ModuleEnum.DASHBOARD, ActionEnum.READ),
  ],

  OPERATOR_PERMISSIONS: [
    createPermission(ModuleEnum.USERS, ActionEnum.READ),
    createPermission(ModuleEnum.STORES, ActionEnum.MANAGE),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.UPDATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.CREATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.READ),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.UPDATE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.CREATE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.READ),
    createPermission(ModuleEnum.ORDERS, ActionEnum.UPDATE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.DELETE),
    createPermission(ModuleEnum.DASHBOARD, ActionEnum.READ),
  ],

  DELIVERY_PERMISSIONS: [
    createPermission(ModuleEnum.USERS, ActionEnum.SELFMANAGE),
    createPermission(ModuleEnum.STORES, ActionEnum.READ),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.SELFMANAGE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.SELFMANAGE),
    createPermission(ModuleEnum.ORDERS, ActionEnum.READ),
    createPermission(ModuleEnum.ORDERS, ActionEnum.UPDATE), // For delivery status updates
    createPermission(ModuleEnum.SETTINGS, ActionEnum.SELFMANAGE),
  ],

  // Read-only permissions
  READ_ONLY_USERS: [createPermission(ModuleEnum.USERS, ActionEnum.READ)],
  READ_ONLY_FINANCES: [createPermission(ModuleEnum.FINANCES, ActionEnum.READ)],
  READ_ONLY_INVENTORY: [
    createPermission(ModuleEnum.INVENTORY, ActionEnum.READ),
  ],
  READ_ONLY_TRANSACTIONS: [
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.READ),
  ],

  // Specialized
  FINANCE_MANAGER: [
    createPermission(ModuleEnum.FINANCES, ActionEnum.MANAGE),
    createPermission(ModuleEnum.REPORTS, ActionEnum.READ),
    createPermission(ModuleEnum.REPORTS, ActionEnum.EXPORT),
    createPermission(ModuleEnum.DASHBOARD, ActionEnum.READ),
  ],
};

export function getPermissionsByRole(role: string) {
  switch (role) {
    case UserRoleEnum.DELIVERY:
      return PermissionSets.DELIVERY_PERMISSIONS;
    case UserRoleEnum.OPERATOR:
      return PermissionSets.OPERATOR_PERMISSIONS;
    case UserRoleEnum.ADMIN:
      return PermissionSets.ADMIN_PERMISSIONS;
    case UserRoleEnum.SUPERADMIN:
      return PermissionSets.SUPERADMIN_PERMISSIONS;
    default:
      throw new BadRequestError("Invalid provided role");
  }
}
