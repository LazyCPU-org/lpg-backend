import { TankRepository } from "../repositories/tankRepository";
import { ItemRepository } from "../repositories/itemRepository";
import { TankType, InventoryItem } from "../dtos/response/inventoryInterface";
import {
  CreateTankTypeRequest,
  UpdateTankTypeRequest,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  TankTypeFiltersRequest,
  InventoryItemFiltersRequest,
} from "../dtos/request/productDTO";
import { 
  ConflictError, 
  NotFoundError,
  BadRequestError 
} from "../utils/custom-errors";

export interface ProductService {
  // Tank operations
  getTanks(filters?: TankTypeFiltersRequest): Promise<{ data: TankType[], total: number }>;
  getTankById(id: number): Promise<TankType>;
  createTank(data: CreateTankTypeRequest): Promise<TankType>;
  updateTank(id: number, data: UpdateTankTypeRequest): Promise<TankType>;
  deleteTank(id: number): Promise<void>;
  restoreTank(id: number): Promise<TankType>;
  
  // Item operations
  getItems(filters?: InventoryItemFiltersRequest): Promise<{ data: InventoryItem[], total: number }>;
  getItemById(id: number): Promise<InventoryItem>;
  createItem(data: CreateInventoryItemRequest): Promise<InventoryItem>;
  updateItem(id: number, data: UpdateInventoryItemRequest): Promise<InventoryItem>;
  deleteItem(id: number): Promise<void>;
  restoreItem(id: number): Promise<InventoryItem>;
  
  // Search operations
  searchProducts(query: string, type?: 'tanks' | 'items' | 'all', limit?: number): Promise<{
    tanks?: TankType[];
    items?: InventoryItem[];
    total_results: number;
  }>;
}

export class ProductServiceImpl implements ProductService {
  constructor(
    private tankRepository: TankRepository,
    private itemRepository: ItemRepository
  ) {}

  // Tank operations
  async getTanks(filters?: TankTypeFiltersRequest): Promise<{ data: TankType[], total: number }> {
    return await this.tankRepository.findAll(filters);
  }

  async getTankById(id: number): Promise<TankType> {
    const tank = await this.tankRepository.findById(id);
    if (!tank) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
    return tank;
  }

  async createTank(data: CreateTankTypeRequest): Promise<TankType> {
    // Check for duplicate name
    const existingTank = await this.tankRepository.findByName(data.name);
    if (existingTank) {
      throw new ConflictError("Ya existe un tipo de tanque con este nombre");
    }
    
    // Validate business rules
    if (data.sell_price <= data.purchase_price) {
      throw new BadRequestError("El precio de venta debe ser mayor al precio de compra");
    }
    
    return await this.tankRepository.create(data);
  }

  async updateTank(id: number, data: UpdateTankTypeRequest): Promise<TankType> {
    // Check if tank exists
    const existingTank = await this.tankRepository.findById(id);
    if (!existingTank) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
    
    // Check for duplicate name (excluding current tank)
    if (data.name) {
      const duplicateTank = await this.tankRepository.findByName(data.name, id);
      if (duplicateTank) {
        throw new ConflictError("Ya existe un tipo de tanque con este nombre");
      }
    }
    
    // Validate business rules if prices are being updated
    const finalSellPrice = data.sell_price ?? Number(existingTank.sell_price);
    const finalPurchasePrice = data.purchase_price ?? Number(existingTank.purchase_price);
    
    if (finalSellPrice <= finalPurchasePrice) {
      throw new BadRequestError("El precio de venta debe ser mayor al precio de compra");
    }
    
    return await this.tankRepository.update(id, data);
  }

  async deleteTank(id: number): Promise<void> {
    // Check if tank exists
    const existingTank = await this.tankRepository.findById(id);
    if (!existingTank) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
    
    // Check if referenced in orders or inventory
    const [referencedInOrders, referencedInInventory] = await Promise.all([
      this.tankRepository.isReferencedInOrders(id),
      this.tankRepository.isReferencedInInventory(id)
    ]);
    
    if (referencedInOrders) {
      throw new ConflictError("No se puede eliminar el tipo de tanque: está referenciado en órdenes existentes");
    }
    
    if (referencedInInventory) {
      throw new ConflictError("No se puede eliminar el tipo de tanque: está referenciado en inventario actual");
    }
    
    const deleted = await this.tankRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
  }

  async restoreTank(id: number): Promise<TankType> {
    const tank = await this.tankRepository.findById(id, true);
    if (!tank) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
    
    if (tank.is_active) {
      throw new BadRequestError("El tipo de tanque no está eliminado");
    }
    
    // Check if name conflicts with active tanks
    const duplicateTank = await this.tankRepository.findByName(tank.name);
    if (duplicateTank) {
      throw new ConflictError("Ya existe un tipo de tanque activo con este nombre");
    }
    
    return await this.tankRepository.restore(id);
  }

  // Item operations
  async getItems(filters?: InventoryItemFiltersRequest): Promise<{ data: InventoryItem[], total: number }> {
    return await this.itemRepository.findAll(filters);
  }

  async getItemById(id: number): Promise<InventoryItem> {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
    return item;
  }

  async createItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    // Check for duplicate name
    const existingItem = await this.itemRepository.findByName(data.name);
    if (existingItem) {
      throw new ConflictError("Ya existe un artículo con este nombre");
    }
    
    // Validate business rules
    if (data.sell_price <= data.purchase_price) {
      throw new BadRequestError("El precio de venta debe ser mayor al precio de compra");
    }
    
    return await this.itemRepository.create(data);
  }

  async updateItem(id: number, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
    // Check if item exists
    const existingItem = await this.itemRepository.findById(id);
    if (!existingItem) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
    
    // Check for duplicate name (excluding current item)
    if (data.name) {
      const duplicateItem = await this.itemRepository.findByName(data.name, id);
      if (duplicateItem) {
        throw new ConflictError("Ya existe un artículo con este nombre");
      }
    }
    
    // Validate business rules if prices are being updated
    const finalSellPrice = data.sell_price ?? Number(existingItem.sell_price);
    const finalPurchasePrice = data.purchase_price ?? Number(existingItem.purchase_price);
    
    if (finalSellPrice <= finalPurchasePrice) {
      throw new BadRequestError("El precio de venta debe ser mayor al precio de compra");
    }
    
    return await this.itemRepository.update(id, data);
  }

  async deleteItem(id: number): Promise<void> {
    // Check if item exists
    const existingItem = await this.itemRepository.findById(id);
    if (!existingItem) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
    
    // Check if referenced in orders or inventory
    const [referencedInOrders, referencedInInventory] = await Promise.all([
      this.itemRepository.isReferencedInOrders(id),
      this.itemRepository.isReferencedInInventory(id)
    ]);
    
    if (referencedInOrders) {
      throw new ConflictError("No se puede eliminar el artículo: está referenciado en órdenes existentes");
    }
    
    if (referencedInInventory) {
      throw new ConflictError("No se puede eliminar el artículo: está referenciado en inventario actual");
    }
    
    const deleted = await this.itemRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
  }

  async restoreItem(id: number): Promise<InventoryItem> {
    const item = await this.itemRepository.findById(id, true);
    if (!item) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
    
    if (item.is_active) {
      throw new BadRequestError("El artículo no está eliminado");
    }
    
    // Check if name conflicts with active items
    const duplicateItem = await this.itemRepository.findByName(item.name);
    if (duplicateItem) {
      throw new ConflictError("Ya existe un artículo activo con este nombre");
    }
    
    return await this.itemRepository.restore(id);
  }

  // Search operations
  async searchProducts(
    query: string, 
    type: 'tanks' | 'items' | 'all' = 'all', 
    limit = 20
  ): Promise<{
    tanks?: TankType[];
    items?: InventoryItem[];
    total_results: number;
  }> {
    const results: any = {};
    let totalResults = 0;
    
    if (type === 'tanks' || type === 'all') {
      const tankResults = await this.tankRepository.findAll({
        search: query,
        limit: type === 'all' ? Math.ceil(limit / 2) : limit
      });
      results.tanks = tankResults.data;
      totalResults += tankResults.data.length;
    }
    
    if (type === 'items' || type === 'all') {
      const itemResults = await this.itemRepository.findAll({
        search: query,
        limit: type === 'all' ? Math.ceil(limit / 2) : limit
      });
      results.items = itemResults.data;
      totalResults += itemResults.data.length;
    }
    
    results.total_results = totalResults;
    
    return results;
  }
}