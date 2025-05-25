import {
  Store,
  StoreAssignment,
  StoreCatalog,
  StoreRelationOptions,
  StoreWithRelations,
} from "../dtos/response/storeInterface";
import { StoreRepository } from "../repositories/storeRepository";
import { BadRequestError } from "../utils/custom-errors";

export interface IStoreService {
  findStoreList(): Promise<Store[]>;
  findStoreById(
    storeId: number,
    relations?: StoreRelationOptions
  ): Promise<StoreWithRelations>;

  createNewStore(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string,
    mapsUrl: string
  ): Promise<Store>;
  createNewStoreAssignment(
    storeId: number,
    userId: number
  ): Promise<StoreAssignment>;

  updateStoreLocation(
    storeId: number,
    latitude: string,
    longitude: string
  ): Promise<Store>;

  // NEW: Catalog management methods
  getStoreCatalog(storeId: number): Promise<StoreCatalog>;
  initializeStoreCatalog(storeId: number): Promise<void>;
}

export class StoreService implements IStoreService {
  private storeRepository: StoreRepository;

  constructor(storeRepository: StoreRepository) {
    this.storeRepository = storeRepository;
  }

  async findStoreList(): Promise<Store[]> {
    return await this.storeRepository.find();
  }

  async findStoreById(
    storeId: number,
    relations: StoreRelationOptions = {}
  ): Promise<StoreWithRelations> {
    return await this.storeRepository.findById(storeId, relations);
  }

  async createNewStore(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string,
    mapsUrl: string
  ): Promise<Store> {
    // Check for duplicate store names
    const existingStore = await this.storeRepository.findByName(name);
    if (existingStore) {
      throw new BadRequestError("Una tienda con este nombre ya existe");
    }

    // Validate coordinates if provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        throw new BadRequestError("Coordenadas inválidas");
      }

      if (lat < -90 || lat > 90) {
        throw new BadRequestError("Latitud debe estar entre -90 y 90");
      }

      if (lng < -180 || lng > 180) {
        throw new BadRequestError("Longitud debe estar entre -180 y 180");
      }
    }

    // Create store - catalog initialization happens automatically in repository
    return await this.storeRepository.create(
      name,
      address,
      latitude,
      longitude,
      phoneNumber,
      mapsUrl
    );
  }

  async createNewStoreAssignment(
    storeId: number,
    userId: number
  ): Promise<StoreAssignment> {
    return await this.storeRepository.createAssignment(storeId, userId);
  }

  async updateStoreLocation(
    storeId: number,
    latitude: string,
    longitude: string
  ): Promise<Store> {
    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestError("Coordenadas inválidas");
    }

    if (lat < -90 || lat > 90) {
      throw new BadRequestError("Latitud debe estar entre -90 y 90");
    }

    if (lng < -180 || lng > 180) {
      throw new BadRequestError("Longitud debe estar entre -180 y 180");
    }

    return await this.storeRepository.updateLocation(
      storeId,
      latitude,
      longitude
    );
  }

  /**
   * Get the product catalog for a specific store
   */
  async getStoreCatalog(storeId: number): Promise<StoreCatalog> {
    return await this.storeRepository.getStoreCatalog(storeId);
  }

  /**
   * Initialize catalog for an existing store
   * This method is useful if a store was created before the catalog system
   * or if you want to add new products to all stores
   */
  async initializeStoreCatalog(storeId: number): Promise<void> {
    await this.storeRepository.initializeStoreCatalog(storeId);
  }
}
