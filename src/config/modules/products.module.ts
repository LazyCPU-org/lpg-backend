import { TankRepository, PgTankRepository } from "../../repositories/tankRepository";
import { ItemRepository, PgItemRepository } from "../../repositories/itemRepository";
import { ProductService, ProductServiceImpl } from "../../services/productService";
import { DIModule, CoreDependencies } from "../types/moduleTypes";

export interface ProductsDependencies {
  // Repositories
  tankRepository: TankRepository;
  itemRepository: ItemRepository;
  
  // Services
  productService: ProductService;
}

export class ProductsModule implements DIModule<ProductsDependencies> {
  private dependencies: ProductsDependencies | null = null;

  createDependencies(coreDeps: CoreDependencies): ProductsDependencies {
    // Create repositories
    const tankRepository = new PgTankRepository();
    const itemRepository = new PgItemRepository();

    // Create services
    const productService = new ProductServiceImpl(
      tankRepository,
      itemRepository
    );

    this.dependencies = {
      tankRepository,
      itemRepository,
      productService,
    };

    return this.dependencies;
  }

  getDependencies(): ProductsDependencies {
    if (!this.dependencies) {
      throw new Error("Products dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}