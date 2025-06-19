import { CoreModule } from "./modules/core.module";
import { AuthModule, AuthDependencies } from "./modules/auth.module";
import { InventoryModule, InventoryDependencies } from "./modules/inventory.module";
import { OrdersModule, OrdersDependencies } from "./modules/orders.module";
import { ProductsModule, ProductsDependencies } from "./modules/products.module";
import { CustomersModule, CustomersDependencies } from "./modules/customers.module";
import { CoreDependencies } from "./types/moduleTypes";

export type Container = CoreDependencies & AuthDependencies & InventoryDependencies & OrdersDependencies & ProductsDependencies & CustomersDependencies;

export function createContainer(): Container {
  // Initialize modules
  const coreModule = new CoreModule();
  const authModule = new AuthModule();
  const inventoryModule = new InventoryModule();
  const ordersModule = new OrdersModule();
  const productsModule = new ProductsModule();
  const customersModule = new CustomersModule();

  // Create dependencies in dependency order
  const coreDeps = coreModule.createDependencies();
  const authDeps = authModule.createDependencies(coreDeps);
  const inventoryDeps = inventoryModule.createDependencies(coreDeps);
  const ordersDeps = ordersModule.createDependencies(coreDeps, inventoryDeps);
  const productsDeps = productsModule.createDependencies(coreDeps);
  // Pass the shared customer repository from orders module to avoid duplication
  const customersDeps = customersModule.createDependencies(coreDeps, ordersDeps);

  // Return merged container
  return {
    ...coreDeps,
    ...authDeps,
    ...inventoryDeps,
    ...ordersDeps,
    ...productsDeps,
    ...customersDeps,
  };
}
