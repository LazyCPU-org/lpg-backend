import preRegistration from "./pre-registration";
import superadmins from "./superadmins";
import { users, usersRelations } from "./users";
import admins from "./admins";
import operators from "./operators";
import deliveryPersonnel from "./delivery-personnel";
import userProfiles from "./user-profiles";
import { rolesEnum, statusEnum } from "./enums";

export {
  // Base user table
  users,
  // User roles
  deliveryPersonnel,
  operators,
  admins,
  superadmins,
  // User profile information
  userProfiles,
  //User register process
  preRegistration,
  // Enums
  rolesEnum,
  statusEnum,
  // Relations
  usersRelations,
};
