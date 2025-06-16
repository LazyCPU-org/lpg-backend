import { DateService, IDateService } from "../../services/dateService";
import { IInventoryDateService, InventoryDateService } from "../../services/inventory";
import { PermissionManager } from "../../utils/permission-actions";
import { PgAuthRepository } from "../../repositories/authRepository";
import { PgUserRepository } from "../../repositories/userRepository";
import { DIModule, CoreDependencies } from "../types/moduleTypes";

export class CoreModule implements DIModule<CoreDependencies> {
  private dependencies: CoreDependencies | null = null;

  createDependencies(...deps: any[]): CoreDependencies {
    const dateService = new DateService();
    const inventoryDateService = new InventoryDateService(dateService);
    
    // Core utilities that many modules need
    const authRepository = new PgAuthRepository();
    const userRepository = new PgUserRepository();
    const permissionManager = new PermissionManager(authRepository, userRepository);

    this.dependencies = {
      dateService,
      inventoryDateService,
      permissionManager,
    };

    return this.dependencies;
  }

  getDependencies(): CoreDependencies {
    if (!this.dependencies) {
      throw new Error("Core dependencies not initialized. Call createDependencies() first.");
    }
    return this.dependencies;
  }
}