import { eq } from "drizzle-orm";
import { db } from "../db";
import { storeAssignments, stores, users } from "../db/schemas";
import { Store, StoreAssignment } from "../dtos/response/storeInterface";
import { InternalError, NotFoundError } from "../utils/custom-errors";

// Define a specific return type for findById that includes relations
interface StoreWithRelations extends Store {
  assignedUsers: StoreAssignment[];
}

export interface StoreRepository {
  // Find
  find(): Promise<Store[]>;
  findById(storeId: number): Promise<StoreWithRelations>;
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
  async findById(storeId: number): Promise<StoreWithRelations> {
    // First, get the store without trying to load all relations
    const storeBasic = await db.query.stores.findFirst({
      where: eq(stores.storeId, storeId),
    });

    if (!storeBasic) {
      throw new NotFoundError("Id de tienda inválido");
    }

    // Check if the store has any assignments
    const hasAssignments = await db.query.storeAssignments.findFirst({
      where: eq(storeAssignments.storeId, storeId),
    });

    let storeResult;
    if (hasAssignments) {
      // Only try to load all nested relations if assignments exist
      storeResult = await db.query.stores.findFirst({
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
      return storeResult as StoreWithRelations;
    } else {
      // If no assignments, return the basic store with empty assignments
      return {
        ...storeBasic,
        assignedUsers: [],
      } as StoreWithRelations;
    }
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
