import { CoreModule } from "./modules/core.module";
import { AuthModule, AuthDependencies } from "./modules/auth.module";
import { InventoryModule, InventoryDependencies } from "./modules/inventory.module";
import { OrdersModule, OrdersDependencies } from "./modules/orders.module";
import { CoreDependencies } from "./types/moduleTypes";

export type Container = CoreDependencies & AuthDependencies & InventoryDependencies & OrdersDependencies;

export function createContainer(): Container {
  // Initialize modules
  const coreModule = new CoreModule();
  const authModule = new AuthModule();
  const inventoryModule = new InventoryModule();
  const ordersModule = new OrdersModule();

  // Create dependencies in dependency order
  const coreDeps = coreModule.createDependencies();
  const authDeps = authModule.createDependencies(coreDeps);
  const inventoryDeps = inventoryModule.createDependencies(coreDeps);
  const ordersDeps = ordersModule.createDependencies(coreDeps, inventoryDeps);

  // Return merged container
  return {
    ...coreDeps,
    ...authDeps,
    ...inventoryDeps,
    ...ordersDeps,
  };
}
