import { pgEnum } from "drizzle-orm/pg-core";
import { UserRoleEnum } from "../../../config/roles";
import { UserStatus } from "../../../utils/status";

export const rolesEnum = pgEnum("roles_enum", [
  UserRoleEnum.SUPERADMIN,
  UserRoleEnum.ADMIN,
  UserRoleEnum.OPERATOR,
  UserRoleEnum.DELIVERY,
]);

export const statusEnum = pgEnum("status_enum", [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.PENDING,
  UserStatus.BLOCKED,
]);
