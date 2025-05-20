import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  inventoryAssignments,
  storeAssignments,
  stores,
  users,
} from "../db/schemas";
import {
  Store,
  StoreAssignment,
  StoreBasic,
  StoreRelationOptions,
  StoreWithInventory,
  StoreWithUsers,
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
  ): Promise<StoreBasic | StoreWithUsers | StoreWithInventory>;
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
}

export class PgStoreRepository implements StoreRepository {
  async findById(
    storeId: number,
    relations: StoreRelationOptions = {}
  ): Promise<StoreBasic | StoreWithUsers | StoreWithInventory> {
    // Basic store fetch
    const storeBasic = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });

    if (!storeBasic) {
      throw new NotFoundError("Id de tienda inválido");
    }

    // Return basic store if no users relation requested
    if (!relations.users) {
      return storeBasic;
    }

    // Check if store has assignments before loading relations
    const hasAssignments = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.storeId, storeId),
    });

    if (!hasAssignments) {
      return {
        ...storeBasic,
        assignedUsers: [],
      } as StoreWithUsers;
    }

    // Current date for inventory filter
    const today = new Date().toISOString().split("T")[0];

    // Build query with user relations
    let query = {
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
    };

    // If inventory relation is requested, add a sub-query to get only the current day's inventory
    if (relations.inventory) {
      // First, we get the store with assigned users
      const storeWithUsers: StoreWithUsers | undefined =
        await db.query.stores.findFirst(query);

      if (!storeWithUsers) {
        return {
          ...storeBasic,
          assignedUsers: [],
        } as StoreWithUsers;
      }

      // Then for each assigned user, fetch their current inventory (if it exists)
      const enrichedAssignedUsers = await Promise.all(
        storeWithUsers.assignedUsers.map(async (assignment) => {
          // Find today's inventory for this assignment
          const currentInventory =
            await db.query.inventoryAssignments.findFirst({
              where: and(
                eq(inventoryAssignments.assignmentId, assignment.assignmentId),
                eq(inventoryAssignments.assignmentDate, today)
              ),
              with: {
                assignedByUser: {
                  columns: {
                    userId: true,
                    name: true,
                  },
                },
              },
            });

          // Return assignment with current inventory (if exists)
          return {
            ...assignment,
            currentInventory: currentInventory || undefined,
          };
        })
      );

      // Return store with users and their current inventory
      return {
        ...storeWithUsers,
        assignedUsers: enrichedAssignedUsers,
      } as StoreWithInventory;
    }

    // Just return store with users (no inventory)
    const storeResult = await db.query.stores.findFirst(query);
    return storeResult as StoreWithUsers;
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
    const results = await db
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
    if (!results) {
      throw new InternalError("Error creando tienda");
    }

    return results[0];
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
      })
      .where(eq(stores.storeId, storeId))
      .returning();
    if (!results)
      throw new InternalError("Error actualizando ubicación de tienda");

    return results[0];
  }

  async createAssignment(
    storeId: number,
    userId: number
  ): Promise<StoreAssignment> {
    const store = db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });
    if (!store) throw new NotFoundError("Tienda no válida");

    const user = db.query.users.findFirst({
      where: eq(users.userId, userId),
    });
    if (!user) throw new NotFoundError("Usuario no válido");

    // We're making sure
    const userAssigned = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.userId, userId),
    });

    if (userAssigned) throw new ConflictError("Usuario ya asignado a tienda");

    const result = await db
      .insert(storeAssignments)
      .values({
        storeId,
        userId,
      })
      .returning();

    if (!result) throw new InternalError("Error creando nueva asignación");

    return result[0];
  }
}
