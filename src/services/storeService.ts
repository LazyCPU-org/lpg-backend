import {
  Store,
  StoreAssignment,
  StoreRelationOptions,
} from "../dtos/response/storeInterface";
import { StoreRepository } from "../repositories/storeRepository";
import { BadRequestError } from "../utils/custom-errors";

export interface IStoreService {
  findStoreList(): Promise<Store[]>;
  findStoreById(
    storeId: number,
    relations?: StoreRelationOptions
  ): Promise<Store>;

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
  ): Promise<Store> {
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
    return await this.storeRepository.updateLocation(
      storeId,
      latitude,
      longitude
    );
  }
}
