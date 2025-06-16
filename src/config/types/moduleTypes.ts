import { IDateService } from '../../services/dateService';
import { IInventoryDateService } from '../../services/inventory';
import { PermissionManager } from '../../utils/permission-actions';

export interface DIModule<T = any> {
  createDependencies(...deps: any[]): T;
  getDependencies(): T;
}

export interface CoreDependencies {
  dateService: IDateService;
  inventoryDateService: IInventoryDateService;
  permissionManager: PermissionManager;
}