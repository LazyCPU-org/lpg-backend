// Define modules
export enum ModuleEnum {
  USERS = "users",
  FINANCES = "finances",
  INVENTORY = "inventory",
  TRANSACTIONS = "transactions",
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
  EXPORT = "export", // For reports export
  APPROVE = "approve", // For approving transactions, etc.
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
  SUPERADMIN: ["*"],

  // Module-specific full access permissions
  FULL_USERS_ACCESS: [
    createPermission(ModuleEnum.USERS, ActionEnum.CREATE),
    createPermission(ModuleEnum.USERS, ActionEnum.READ),
    createPermission(ModuleEnum.USERS, ActionEnum.UPDATE),
    createPermission(ModuleEnum.USERS, ActionEnum.DELETE),
  ],

  FULL_FINANCES_ACCESS: [
    createPermission(ModuleEnum.FINANCES, ActionEnum.CREATE),
    createPermission(ModuleEnum.FINANCES, ActionEnum.READ),
    createPermission(ModuleEnum.FINANCES, ActionEnum.UPDATE),
    createPermission(ModuleEnum.FINANCES, ActionEnum.DELETE),
  ],

  FULL_INVENTORY_ACCESS: [
    createPermission(ModuleEnum.INVENTORY, ActionEnum.CREATE),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.UPDATE),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.DELETE),
  ],

  FULL_TRANSACTIONS_ACCESS: [
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.CREATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.READ),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.UPDATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.DELETE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.APPROVE),
  ],

  // Role-based permission sets
  ADMIN_PERMISSIONS: [
    createPermission(ModuleEnum.USERS, ActionEnum.MANAGE),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.MANAGE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.MANAGE),
    createPermission(ModuleEnum.REPORTS, ActionEnum.READ),
    createPermission(ModuleEnum.REPORTS, ActionEnum.EXPORT),
    createPermission(ModuleEnum.DASHBOARD, ActionEnum.READ),
  ],

  OPERATOR_PERMISSIONS: [
    createPermission(ModuleEnum.USERS, ActionEnum.READ),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.READ),
    createPermission(ModuleEnum.INVENTORY, ActionEnum.UPDATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.CREATE),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.READ),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.UPDATE),
    createPermission(ModuleEnum.DASHBOARD, ActionEnum.READ),
  ],

  DELIVERY_PERMISSIONS: [
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.READ),
    createPermission(ModuleEnum.TRANSACTIONS, ActionEnum.UPDATE),
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
