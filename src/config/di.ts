import { CoreModule } from "./modules/core.module";
import { AuthModule, AuthDependencies } from "./modules/auth.module";
import { InventoryModule, InventoryDependencies } from "./modules/inventory.module";
import { OrdersModule, OrdersDependencies } from "./modules/orders.module";
import { ProductsModule, ProductsDependencies } from "./modules/products.module";
import { CoreDependencies } from "./types/moduleTypes";

export type Container = CoreDependencies & AuthDependencies & InventoryDependencies & OrdersDependencies & ProductsDependencies;

export function createContainer(): Container {
  // Initialize modules
  const coreModule = new CoreModule();
  const authModule = new AuthModule();
  const inventoryModule = new InventoryModule();
  const ordersModule = new OrdersModule();
  const productsModule = new ProductsModule();

  // Create dependencies in dependency order
  const coreDeps = coreModule.createDependencies();
  const authDeps = authModule.createDependencies(coreDeps);
  const inventoryDeps = inventoryModule.createDependencies(coreDeps);
  const ordersDeps = ordersModule.createDependencies(coreDeps, inventoryDeps);
  const productsDeps = productsModule.createDependencies(coreDeps);

  // Return merged container
  return {
    ...coreDeps,
    ...authDeps,
    ...inventoryDeps,
    ...ordersDeps,
    ...productsDeps,
  };
}
