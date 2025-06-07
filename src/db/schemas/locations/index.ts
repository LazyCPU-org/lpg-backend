import storeAssignments, {
  storeAssignmentsRelations,
} from "./store-assignments";
import storeAssignmentCurrentInventory, {
  storeAssignmentCurrentInventoryRelations,
} from "./store-assignment-current-inventory";
import {
  storeCatalogItems,
  storeCatalogItemsRelations,
  storeCatalogTanks,
  storeCatalogTanksRelations,
} from "./store-catalog";
import stores, { storesRelations } from "./stores";

export {
  storeAssignments,
  storeAssignmentsRelations,
  storeAssignmentCurrentInventory,
  storeAssignmentCurrentInventoryRelations,
  storeCatalogItems,
  storeCatalogItemsRelations,
  storeCatalogTanks,
  storeCatalogTanksRelations,
  // Base tables
  stores,
  // Relations
  storesRelations,
};
