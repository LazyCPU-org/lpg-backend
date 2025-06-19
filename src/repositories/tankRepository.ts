import { and, count, desc, eq, gte, ilike, lte, ne, or } from "drizzle-orm";
import { db } from "../db";
import { tankType } from "../db/schemas/inventory";
import { orderItems, inventoryReservations } from "../db/schemas/orders";
import { assignmentTanks } from "../db/schemas/inventory/inventory-assignments-tanks";
import { TankType } from "../dtos/response/inventoryInterface";
import {
  CreateTankTypeRequest,
  UpdateTankTypeRequest,
  TankTypeFiltersRequest,
} from "../dtos/request/productDTO";
import { 
  ConflictError, 
  InternalError, 
  NotFoundError 
} from "../utils/custom-errors";

export interface TankRepository {
  findAll(filters?: TankTypeFiltersRequest): Promise<{ data: TankType[], total: number }>;
  findById(id: number, includeDeleted?: boolean): Promise<TankType | null>;
  findByName(name: string, excludeId?: number): Promise<TankType | null>;
  create(data: CreateTankTypeRequest): Promise<TankType>;
  update(id: number, data: UpdateTankTypeRequest): Promise<TankType>;
  softDelete(id: number): Promise<boolean>;
  restore(id: number): Promise<TankType>;
  isReferencedInOrders(id: number): Promise<boolean>;
  isReferencedInInventory(id: number): Promise<boolean>;
}

export class PgTankRepository implements TankRepository {
  async findAll(filters: TankTypeFiltersRequest = {}): Promise<{ data: TankType[], total: number }> {
    const {
      include_deleted = false,
      search,
      weight,
      price_min,
      price_max,
      limit = 50,
      offset = 0
    } = filters;

    const conditions = [];
    
    // Active/deleted filter
    if (!include_deleted) {
      conditions.push(eq(tankType.is_active, true));
    }
    
    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(tankType.name, `%${search}%`),
          ilike(tankType.description, `%${search}%`)
        )
      );
    }
    
    // Weight filter
    if (weight) {
      conditions.push(eq(tankType.weight, weight));
    }
    
    // Price range filters
    if (price_min !== undefined) {
      conditions.push(gte(tankType.sell_price, price_min.toString()));
    }
    
    if (price_max !== undefined) {
      conditions.push(lte(tankType.sell_price, price_max.toString()));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Execute both queries in parallel
    const [data, countResult] = await Promise.all([
      db.select()
        .from(tankType)
        .where(whereClause)
        .orderBy(desc(tankType.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(tankType)
        .where(whereClause)
    ]);
    
    return {
      data,
      total: countResult[0]?.count ?? 0
    };
  }

  async findById(id: number, includeDeleted = false): Promise<TankType | null> {
    const conditions = [eq(tankType.typeId, id)];
    
    if (!includeDeleted) {
      conditions.push(eq(tankType.is_active, true));
    }
    
    const result = await db.select()
      .from(tankType)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  }

  async findByName(name: string, excludeId?: number): Promise<TankType | null> {
    const conditions = [
      eq(tankType.name, name),
      eq(tankType.is_active, true)
    ];
    
    if (excludeId) {
      conditions.push(ne(tankType.typeId, excludeId));
    }
    
    const result = await db.select()
      .from(tankType)
      .where(and(...conditions))
      .limit(1);
      
    return result[0] || null;
  }

  async create(data: CreateTankTypeRequest): Promise<TankType> {
    try {
      const [result] = await db.insert(tankType)
        .values({
          ...data,
          purchase_price: data.purchase_price.toString(),
          sell_price: data.sell_price.toString(),
          scale: data.scale || "unidad",
          is_active: true,
          deleted_at: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      if (!result) {
        throw new InternalError("Error creando tipo de tanque");
      }
      
      return result;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError("Ya existe un tipo de tanque con este nombre");
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateTankTypeRequest): Promise<TankType> {
    try {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      if (data.purchase_price !== undefined) {
        updateData.purchase_price = data.purchase_price.toString();
      }
      if (data.sell_price !== undefined) {
        updateData.sell_price = data.sell_price.toString();
      }
      
      const [result] = await db.update(tankType)
        .set(updateData)
        .where(and(
          eq(tankType.typeId, id),
          eq(tankType.is_active, true)
        ))
        .returning();
        
      if (!result) {
        throw new NotFoundError("Tipo de tanque no encontrado");
      }
      
      return result;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError("Ya existe un tipo de tanque con este nombre");
      }
      throw error;
    }
  }

  async softDelete(id: number): Promise<boolean> {
    const [result] = await db.update(tankType)
      .set({
        is_active: false,
        deleted_at: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(tankType.typeId, id),
        eq(tankType.is_active, true)
      ))
      .returning();
      
    return !!result;
  }

  async restore(id: number): Promise<TankType> {
    const [result] = await db.update(tankType)
      .set({
        is_active: true,
        deleted_at: null,
        updatedAt: new Date()
      })
      .where(eq(tankType.typeId, id))
      .returning();
      
    if (!result) {
      throw new NotFoundError("Tipo de tanque no encontrado");
    }
    
    return result;
  }

  async isReferencedInOrders(id: number): Promise<boolean> {
    // Check if tank type is referenced in any order items
    const orderReference = await db.select({ count: count() })
      .from(orderItems)
      .where(eq(orderItems.tankTypeId, id))
      .limit(1);
      
    if (orderReference[0]?.count > 0) {
      return true;
    }
    
    // Check if tank type is referenced in any inventory reservations
    const reservationReference = await db.select({ count: count() })
      .from(inventoryReservations)
      .where(eq(inventoryReservations.tankTypeId, id))
      .limit(1);
      
    return reservationReference[0]?.count > 0;
  }

  async isReferencedInInventory(id: number): Promise<boolean> {
    // Check if tank type is referenced in current inventory assignments
    const inventoryReference = await db.select({ count: count() })
      .from(assignmentTanks)
      .where(eq(assignmentTanks.tankTypeId, id))
      .limit(1);
      
    return inventoryReference[0]?.count > 0;
  }
}