// Import all module indexes
import * as userManagement from './user-management';
import * as locations from './locations';
import * as inventory from './inventory';
import * as customers from './customers';
import * as orders from './orders';
import * as vehicles from './vehicles';
import * as finance from './finance';
import * as audit from './audit';

// Export everything
export {
  userManagement,
  locations,
  inventory,
  customers,
  orders,
  vehicles,
  finance,
  audit
};

// Export specific tables for convenience
export const {
  users,
  admins,
  operators,
  deliveryPersonnel,
  userProfiles
} = userManagement;

export const {
  stores,
  storeAssignments
} = locations;

export const {
  tankTypes,
  accessories,
  storeInventory,
  inventoryTransactions,
  deliveryInventoryAssignments,
  deliveryInventoryItems
} = inventory;

export const {
  customers: customersTable,
  customerDebts
} = customers;

export const {
  orders: ordersTable,
  orderItems,
  invoices
} = orders;

export const {
  vehicles: vehiclesTable,
  vehicleAssignments,
  vehicleFuelPurchases,
  vehicleMaintenance
} = vehicles;

export const {
  supplierOrders,
  supplierOrderItems,
  dailyReports,
  dailyCashReconciliation,
  expenses
} = finance;

export const {
  auditLogs
} = audit;
