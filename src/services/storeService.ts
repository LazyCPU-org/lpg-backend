import { Store, StoreAssignment } from "../dtos/response/storeInterface";
import { StoreRepository } from "../repositories/storeRepository";
import { BadRequestError } from "../utils/custom-errors";

export interface IStoreService {
  findStoreList(): Promise<Store[]>;
  findStoreById(storeId: number): Promise<Store>;

  createNewStore(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string
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

  async findStoreById(storeId: number): Promise<Store> {
    return await this.storeRepository.findById(storeId);
  }

  async createNewStore(
    name: string,
    address: string,
    latitude: string,
    longitude: string,
    phoneNumber: string
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
      phoneNumber
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
