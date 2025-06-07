import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  inventoryAssignments,
  inventoryItem,
  storeAssignments,
  storeAssignmentCurrentInventory,
  storeCatalogItems,
  storeCatalogTanks,
  stores,
  tankType,
  users,
} from "../db/schemas";
import { InventoryItem, TankType } from "../dtos/response/inventoryInterface";
import {
  Store,
  StoreAssignment,
  StoreCatalog,
  StoreRelationOptions,
  StoreWithRelations,
} from "../dtos/response/storeInterface";
import {
  ConflictError,
  InternalError,
  NotFoundError,
} from "../utils/custom-errors";

export interface StoreRepository {
  // Find
  find(): Promise<Store[]>;
  findById(
    storeId: number,
    relations: StoreRelationOptions
  ): Promise<StoreWithRelations>;
  findByName(name: string): Promise<Store | undefined>;

  // Create
  create(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string,
    mapsUrl: string
  ): Promise<Store>;
  createAssignment(storeId: number, userId: number): Promise<StoreAssignment>;

  // Update
  updateLocation(
    storeId: number,
    latitude: string,
    longitude: string
  ): Promise<Store>;

  // NEW: Catalog Management
  initializeStoreCatalog(storeId: number): Promise<void>;
  getStoreCatalog(storeId: number): Promise<StoreCatalog>;
}

export class PgStoreRepository implements StoreRepository {
  /**
   * Get current date in GMT-5 timezone formatted as YYYY-MM-DD
   * This ensures we always work with dates in the application's timezone
   */
  private getCurrentDateInTimezone(): string {
    // Get current UTC time
    const now = new Date();

    // Convert to GMT-5 (subtract 5 hours from UTC)
    const gmt5Time = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    // Format as YYYY-MM-DD
    const year = gmt5Time.getUTCFullYear();
    const month = String(gmt5Time.getUTCMonth() + 1).padStart(2, "0");
    const day = String(gmt5Time.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async findById(
    storeId: number,
    relations: StoreRelationOptions = {}
  ): Promise<StoreWithRelations> {
    // Basic store fetch
    const storeBasic = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });

    if (!storeBasic) {
      throw new NotFoundError("Id de tienda inválido");
    }

    // Start building the response
    let storeResponse: any = { ...storeBasic };

    // Handle assignments relation (renamed from 'users')
    if (relations.assignments) {
      const assignmentsData = await this.getStoreAssignments(
        storeId,
        relations.inventory
      );
      storeResponse.assignedUsers = assignmentsData;
    }

    // Handle catalog relation (NEW)
    if (relations.catalog) {
      const catalogData = await this.getStoreCatalog(storeId);
      storeResponse.catalog = catalogData;
    }

    // Handle inventory relation
    if (relations.inventory && !relations.assignments) {
      // If assignments not already loaded, load them with inventory
      const inventoryData = await this.getStoreAssignments(storeId, true);
      storeResponse.currentInventory = inventoryData;
    }

    return storeResponse;
  }

  private async getStoreAssignments(
    storeId: number,
    includeInventory: boolean = false
  ) {
    const hasAssignments = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.storeId, storeId),
    });

    if (!hasAssignments) {
      return [];
    }

    // Note: No longer need date calculation for current inventory lookup since we use direct reference

    // Build query with user relations
    const storeWithUsers = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
      with: {
        assignedUsers: {
          with: {
            user: {
              with: {
                userProfile: {
                  columns: {
                    firstName: true,
                    lastName: true,
                    entryDate: true,
                  },
                },
              },
              columns: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!storeWithUsers || !storeWithUsers.assignedUsers) {
      return [];
    }

    // If inventory is requested, use current inventory state table
    if (includeInventory) {
      const enrichedAssignments = await Promise.all(
        storeWithUsers.assignedUsers.map(async (assignment) => {
          // Use the new current inventory state table
          const currentInventoryState = await db.query.storeAssignmentCurrentInventory.findFirst({
            where: eq(storeAssignmentCurrentInventory.assignmentId, assignment.assignmentId)
          });

          let currentInventory = undefined;
          if (currentInventoryState) {
            currentInventory = await db.query.inventoryAssignments.findFirst({
              where: eq(inventoryAssignments.inventoryId, currentInventoryState.currentInventoryId),
              with: {
                assignedByUser: {
                  columns: {
                    userId: true,
                    name: true,
                  },
                },
              },
            });
          }

          return {
            ...assignment,
            currentInventory: currentInventory || undefined,
          };
        })
      );

      return enrichedAssignments;
    }

    return storeWithUsers.assignedUsers;
  }

  async getStoreCatalog(storeId: number): Promise<StoreCatalog> {
    // Fetch store tanks with tank type details using query API
    const tanks = await db.query.storeCatalogTanks.findMany({
      where: eq(storeCatalogTanks.storeId, storeId),
      with: {
        tankType: {
          columns: {
            typeId: true,
            name: true,
            weight: true,
            description: true,
            scale: true,
          },
        },
      },
      orderBy: (storeCatalogTanks, { asc }) => [
        // You can add ordering here if needed
        // asc(storeCatalogTanks.tankTypeId)
      ],
    });

    // Fetch store items with item details using query API
    const items = await db.query.storeCatalogItems.findMany({
      where: eq(storeCatalogItems.storeId, storeId),
      with: {
        inventoryItem: {
          columns: {
            inventoryItemId: true,
            name: true,
            description: true,
            scale: true,
          },
        },
      },
      orderBy: (storeCatalogItems, { asc }) => [
        // You can add ordering here if needed
        // asc(storeCatalogItems.inventoryItemId)
      ],
    });

    return {
      tanks,
      items,
    };
  }

  async find(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async findByName(name: string): Promise<Store | undefined> {
    return await db.query.stores.findFirst({
      where: eq(stores.name, name),
    });
  }

  async create(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string,
    mapsUrl: string
  ): Promise<Store> {
    const result = await db.transaction(async (tx) => {
      // Create the store
      const [newStore] = await tx
        .insert(stores)
        .values({
          name,
          address,
          latitude,
          longitude,
          phoneNumber,
          mapsUrl,
        })
        .returning();

      if (!newStore) {
        throw new InternalError("Error creando tienda");
      }

      // Initialize store catalog with all available products
      await this.initializeStoreCatalogTransaction(newStore.storeId, tx);

      return newStore;
    });

    return result;
  }

  /**
   * Initializes a store's catalog with all available tanks and items
   * This method is called automatically when creating a new store
   */
  async initializeStoreCatalog(storeId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await this.initializeStoreCatalogTransaction(storeId, tx);
    });
  }

  private async initializeStoreCatalogTransaction(
    storeId: number,
    tx: any
  ): Promise<void> {
    // Get all available tank types
    const allTanks = await tx.select().from(tankType);

    // Get all available inventory items
    const allItems = await tx.select().from(inventoryItem);

    // Insert tank types for this store with default pricing
    if (allTanks.length > 0) {
      await tx.insert(storeCatalogTanks).values(
        allTanks.map((tank: TankType) => ({
          storeId,
          tankTypeId: tank.typeId,
          defaultPurchasePrice: tank.purchase_price,
          defaultSellPrice: tank.sell_price,
          isActive: true,
          defaultFullTanks: 0,
          defaultEmptyTanks: 0,
        }))
      );
    }

    // Insert inventory items for this store with default pricing
    if (allItems.length > 0) {
      await tx.insert(storeCatalogItems).values(
        allItems.map((item: InventoryItem) => ({
          storeId,
          inventoryItemId: item.inventoryItemId,
          defaultPurchasePrice: item.purchase_price,
          defaultSellPrice: item.sell_price,
          isActive: true,
          defaultQuantity: 0,
        }))
      );
    }
  }

  async updateLocation(
    storeId: number,
    latitude: string,
    longitude: string
  ): Promise<Store> {
    const results = await db
      .update(stores)
      .set({
        latitude,
        longitude,
        // ✅ KEPT AS UTC: updatedAt should remain in UTC for system timestamps
        updatedAt: new Date(),
      })
      .where(eq(stores.storeId, storeId))
      .returning();

    if (!results || results.length === 0) {
      throw new InternalError("Error actualizando ubicación de tienda");
    }

    return results[0];
  }

  async createAssignment(
    storeId: number,
    userId: number
  ): Promise<StoreAssignment> {
    // Validate store exists
    const store = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });
    if (!store) throw new NotFoundError("Tienda no válida");

    // Validate user exists
    const user = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });
    if (!user) throw new NotFoundError("Usuario no válido");

    // Check if user is already assigned to any store
    const userAssigned = await db.query.storeAssignments.findFirst({
      where: and(
        eq(storeAssignments.userId, userId),
        // Only check for active assignments (no end date)
        isNull(storeAssignments.endDate)
      ),
    });

    if (userAssigned) {
      throw new ConflictError("Usuario ya asignado a otra tienda");
    }

    const [result] = await db
      .insert(storeAssignments)
      .values({
        storeId,
        userId,
      })
      .returning();

    if (!result) {
      throw new InternalError("Error creando nueva asignación");
    }

    return result;
  }
}
