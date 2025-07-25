import { CreateStoreDTO, UpdateStoreDTO, StoreResponseDTO } from '../dtos/store.dto';
import { Store } from '../../domain/entities/store.entity';
import { IStoreRepository } from '../../domain/repositories/store.repository';

/**
 * Use case class for managing store operations (CRUD and search).
 * Encapsulates business logic for creating, updating, retrieving, searching, and deleting stores.
 */
export class StoreUseCases {
  /**
   * @param storeRepository Repository for store persistence operations
   */
  constructor(private readonly storeRepository: IStoreRepository) {}

  /**
   * Creates a new store after validating input data.
   * @param dto Data Transfer Object for store creation
   */
  async createStore(dto: CreateStoreDTO): Promise<StoreResponseDTO> {
    const store = new Store(0, dto.name, dto.address);
    // Validate store entity
    if (!store.isValid()) {
      throw new Error('Invalid store data');
    }
    // Prepare and save store data
    const storeData = Store.fromData({ name: dto.name, address: dto.address });
    const savedStore = await this.storeRepository.save(storeData);
    return this.toResponseDTO(savedStore);
  }

  /**
   * Updates an existing store's details.
   * @param id Store ID
   * @param dto Data Transfer Object for store update
   */
  async updateStore(id: number, dto: UpdateStoreDTO): Promise<StoreResponseDTO> {
    const existingStore = await this.storeRepository.findById(id);
    if (!existingStore) {
      throw new Error('Store not found');
    }
    // Update store details and persist
    existingStore.updateDetails(dto.name, dto.address);
    const updatedStore = await this.storeRepository.update(id, existingStore);
    return this.toResponseDTO(updatedStore);
  }

  /**
   * Retrieves a store by its ID.
   * @param id Store ID
   */
  async getStore(id: number): Promise<StoreResponseDTO> {
    const store = await this.storeRepository.findById(id);
    if (!store) {
      throw new Error('Store not found');
    }
    return this.toResponseDTO(store);
  }

  /**
   * Retrieves all stores.
   */
  async getAllStores(): Promise<StoreResponseDTO[]> {
    const stores = await this.storeRepository.findAll();
    return stores.map(store => this.toResponseDTO(store));
  }

  /**
   * Deletes a store by its ID.
   * @param id Store ID
   */
  async deleteStore(id: number): Promise<void> {
    const store = await this.storeRepository.findById(id);
    if (!store) {
      throw new Error('Store not found');
    }
    await this.storeRepository.delete(id);
  }

  /**
   * Searches for stores by name.
   * @param name Store name to search for
   */
  async searchStores(name: string): Promise<StoreResponseDTO[]> {
    const stores = await this.storeRepository.findByName(name);
    return stores.map(store => this.toResponseDTO(store));
  }

  /**
   * Converts a Store entity to a StoreResponseDTO.
   * @param store Store entity
   */
  private toResponseDTO(store: Store): StoreResponseDTO {
    return {
      id: store.id,
      name: store.name,
      address: store.address ?? ''
    };
  }
}
