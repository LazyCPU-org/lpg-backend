import { and, count, desc, eq, gte, ilike, lte, ne, or } from "drizzle-orm";
import { db } from "../db";
import { inventoryItem } from "../db/schemas/inventory";
import { orderItems, inventoryReservations } from "../db/schemas/orders";
import { assignmentItems } from "../db/schemas/inventory/inventory-assignments-items";
import { InventoryItem } from "../dtos/response/inventoryInterface";
import {
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  InventoryItemFiltersRequest,
} from "../dtos/request/productDTO";
import { 
  ConflictError, 
  InternalError, 
  NotFoundError 
} from "../utils/custom-errors";

export interface ItemRepository {
  findAll(filters?: InventoryItemFiltersRequest): Promise<{ data: InventoryItem[], total: number }>;
  findById(id: number, includeDeleted?: boolean): Promise<InventoryItem | null>;
  findByName(name: string, excludeId?: number): Promise<InventoryItem | null>;
  create(data: CreateInventoryItemRequest): Promise<InventoryItem>;
  update(id: number, data: UpdateInventoryItemRequest): Promise<InventoryItem>;
  softDelete(id: number): Promise<boolean>;
  restore(id: number): Promise<InventoryItem>;
  isReferencedInOrders(id: number): Promise<boolean>;
  isReferencedInInventory(id: number): Promise<boolean>;
}

export class PgItemRepository implements ItemRepository {
  async findAll(filters: InventoryItemFiltersRequest = {}): Promise<{ data: InventoryItem[], total: number }> {
    const {
      include_deleted = false,
      search,
      price_min,
      price_max,
      limit = 50,
      offset = 0
    } = filters;

    const conditions = [];
    
    // Active/deleted filter
    if (!include_deleted) {
      conditions.push(eq(inventoryItem.is_active, true));
    }
    
    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(inventoryItem.name, `%${search}%`),
          ilike(inventoryItem.description, `%${search}%`)
        )
      );
    }
    
    // Price range filters
    if (price_min !== undefined) {
      conditions.push(gte(inventoryItem.sell_price, price_min.toString()));
    }
    
    if (price_max !== undefined) {
      conditions.push(lte(inventoryItem.sell_price, price_max.toString()));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Execute both queries in parallel
    const [data, countResult] = await Promise.all([
      db.select()
        .from(inventoryItem)
        .where(whereClause)
        .orderBy(desc(inventoryItem.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(inventoryItem)
        .where(whereClause)
    ]);
    
    return {
      data,
      total: countResult[0]?.count ?? 0
    };
  }

  async findById(id: number, includeDeleted = false): Promise<InventoryItem | null> {
    const conditions = [eq(inventoryItem.inventoryItemId, id)];
    
    if (!includeDeleted) {
      conditions.push(eq(inventoryItem.is_active, true));
    }
    
    const result = await db.select()
      .from(inventoryItem)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  }

  async findByName(name: string, excludeId?: number): Promise<InventoryItem | null> {
    const conditions = [
      eq(inventoryItem.name, name),
      eq(inventoryItem.is_active, true)
    ];
    
    if (excludeId) {
      conditions.push(ne(inventoryItem.inventoryItemId, excludeId));
    }
    
    const result = await db.select()
      .from(inventoryItem)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  }

  async create(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    try {
      const [result] = await db.insert(inventoryItem)
        .values({
          ...data,
          purchase_price: data.purchase_price.toString(),
          sell_price: data.sell_price.toString(),
          is_active: true,
          deleted_at: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      if (!result) {
        throw new InternalError("Error creando artículo de inventario");
      }
      
      return result;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError("Ya existe un artículo con este nombre");
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
    try {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      if (data.purchase_price !== undefined) {
        updateData.purchase_price = data.purchase_price.toString();
      }
      if (data.sell_price !== undefined) {
        updateData.sell_price = data.sell_price.toString();
      }
      
      const [result] = await db.update(inventoryItem)
        .set(updateData)
        .where(and(
          eq(inventoryItem.inventoryItemId, id),
          eq(inventoryItem.is_active, true)
        ))
        .returning();
        
      if (!result) {
        throw new NotFoundError("Artículo de inventario no encontrado");
      }
      
      return result;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError("Ya existe un artículo con este nombre");
      }
      throw error;
    }
  }

  async softDelete(id: number): Promise<boolean> {
    const [result] = await db.update(inventoryItem)
      .set({
        is_active: false,
        deleted_at: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(inventoryItem.inventoryItemId, id),
        eq(inventoryItem.is_active, true)
      ))
      .returning();
      
    return !!result;
  }

  async restore(id: number): Promise<InventoryItem> {
    const [result] = await db.update(inventoryItem)
      .set({
        is_active: true,
        deleted_at: null,
        updatedAt: new Date()
      })
      .where(eq(inventoryItem.inventoryItemId, id))
      .returning();
      
    if (!result) {
      throw new NotFoundError("Artículo de inventario no encontrado");
    }
    
    return result;
  }

  async isReferencedInOrders(id: number): Promise<boolean> {
    // Check if item is referenced in any order items
    const orderReference = await db.select({ count: count() })
      .from(orderItems)
      .where(eq(orderItems.inventoryItemId, id))
      .limit(1);
      
    if (orderReference[0]?.count > 0) {
      return true;
    }
    
    // Check if item is referenced in any inventory reservations
    const reservationReference = await db.select({ count: count() })
      .from(inventoryReservations)
      .where(eq(inventoryReservations.inventoryItemId, id))
      .limit(1);
      
    return reservationReference[0]?.count > 0;
  }

  async isReferencedInInventory(id: number): Promise<boolean> {
    // Check if item is referenced in current inventory assignments
    const inventoryReference = await db.select({ count: count() })
      .from(assignmentItems)
      .where(eq(assignmentItems.inventoryItemId, id))
      .limit(1);
      
    return inventoryReference[0]?.count > 0;
  }
}