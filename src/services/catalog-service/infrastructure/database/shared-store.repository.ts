import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { IStoreRepository } from '../../domain/repositories/store.repository';
import { Store } from '../../domain/entities/store.entity';
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('shared-store-repository');

/**
 * Shared repository implementation for Store entities.
 * Provides database persistence operations for stores using a shared database.
 */
export class SharedStoreRepository extends BaseRepository<Store, number> implements IStoreRepository {
  /**
   * @param databaseManager Database manager instance for database operations
   */
  constructor(databaseManager: IDatabaseManager) {
    super(databaseManager, 'store');
  }

  /**
   * Creates a new store entity in the database.
   * Override save method to handle entity creation properly.
   * @param entity Store entity without ID
   * @returns Promise resolving to the created Store entity
   */
  public async save(entity: Omit<Store, 'id'>): Promise<Store> {
    try {
      logger.info('Creating new store', { entity });
      const result = await this.model.create({
        data: {
          name: entity.name,
          address: entity.address
        }
      });
      
      const store = new Store(result.id, result.name, result.address ?? undefined);
      logger.info('Created store', { id: result.id });
      return store;
    } catch (error) {
      logger.error('Error creating store', error as Error, { entity });
      throw error;
    }
  }

  /**
   * Updates an existing store entity in the database.
   * Override update method to handle partial updates properly.
   * @param id Store ID
   * @param entity Partial store entity with updated fields
   * @returns Promise resolving to the updated Store entity
   */
  public async update(id: number, entity: Partial<Store>): Promise<Store> {
    try {
      logger.info('Updating store', { id, entity });
      const result = await this.model.update({
        where: { id },
        data: {
          ...(entity.name && { name: entity.name }),
          ...(entity.address !== undefined && { address: entity.address })
        }
      });
      
      const store = new Store(result.id, result.name, result.address ?? undefined);
      logger.info('Updated store', { id });
      return store;
    } catch (error) {
      logger.error('Error updating store', error as Error, { id, entity });
      throw error;
    }
  }

  // Override findById to return domain entity
  public async findById(id: number): Promise<Store | null> {
    try {
      logger.info('Finding store by ID', { id });
      const result = await this.model.findUnique({
        where: { id }
      });
      
      if (!result) {
        logger.info('Store not found', { id });
        return null;
      }
      
      const store = new Store(result.id, result.name, result.address ?? undefined);
      logger.info('Found store', { id });
      return store;
    } catch (error) {
      logger.error('Error finding store by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to return domain entities
  public async findAll(): Promise<Store[]> {
    try {
      logger.info('Finding all stores');
      const results = await this.model.findMany();
      
      const stores = results.map((result: any) => 
        new Store(result.id, result.name, result.address ?? undefined)
      );
      
      logger.info('Found stores', { count: stores.length });
      return stores;
    } catch (error) {
      logger.error('Error finding all stores', error as Error);
      throw error;
    }
  }

  // Store-specific methods
  public async findByName(name: string): Promise<Store[]> {
    try {
      logger.info('Finding stores by name', { name });
      const results = await this.model.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        }
      });
      
      const stores = results.map((result: any) => 
        new Store(result.id, result.name, result.address ?? undefined)
      );
      
      logger.info('Found stores by name', { name, count: stores.length });
      return stores;
    } catch (error) {
      logger.error('Error finding stores by name', error as Error, { name });
      throw error;
    }
  }

  // Override batch operations to handle domain entities
  public async saveMany(entities: Omit<Store, 'id'>[]): Promise<Store[]> {
    try {
      logger.info('Creating multiple stores', { count: entities.length });
      const results = await this.executeInTransaction(async (tx) => {
        const createdStores: Store[] = [];
        for (const entity of entities) {
          const created = await tx.store.create({
            data: {
              name: entity.name,
              address: entity.address
            }
          });
          createdStores.push(new Store(created.id, created.name, created.address ?? undefined));
        }
        return createdStores;
      });
      
      logger.info('Created multiple stores', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error creating multiple stores', error as Error, { count: entities.length });
      throw error;
    }
  }

  // Override findWithPagination to return domain entities
  public async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: Store[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      logger.info('Finding stores with pagination', { page, limit, skip });

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.model.count({ where }),
      ]);

      const stores = data.map((result: any) => 
        new Store(result.id, result.name, result.address ?? undefined)
      );

      const totalPages = Math.ceil(total / limit);

      logger.info('Found stores with pagination', {
        count: stores.length,
        total,
        page,
        totalPages,
      });

      return {
        data: stores,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding stores with pagination', error as Error, { page, limit });
      throw error;
    }
  }
}