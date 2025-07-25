import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { IStockRepository } from '../../domain/repositories/stock.repository';
import { Stock } from '../../domain/entities/stock.entity';
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('shared-stock-repository');

/**
 * Shared repository implementation for Stock entities.
 * Provides database persistence operations for stock using a shared database.
 */
export class SharedStockRepository extends BaseRepository<Stock, number> implements IStockRepository {
  /**
   * @param databaseManager Database manager instance for database operations
   */
  constructor(databaseManager: IDatabaseManager) {
    super(databaseManager, 'stock');
  }

  /**
   * Creates a new stock entity in the database.
   * Override save method to handle entity creation properly.
   * @param entity Stock entity without ID
   * @returns Promise resolving to the created Stock entity
   */
  public async save(entity: Omit<Stock, 'id'>): Promise<Stock> {
    try {
      logger.info('Creating new stock', { entity });
      const result = await this.model.create({
        data: {
          storeId: entity.storeId,
          productId: entity.productId,
          quantity: entity.quantity
        }
      });
      
      const stock = new Stock(result.storeId, result.productId, result.quantity, result.id);
      logger.info('Created stock', { id: result.id });
      return stock;
    } catch (error) {
      logger.error('Error creating stock', error as Error, { entity });
      throw error;
    }
  }

  /**
   * Updates an existing stock entity in the database.
   * Override update method to handle partial updates properly.
   * @param id Stock ID
   * @param entity Partial stock entity with updated fields
   * @returns Promise resolving to the updated Stock entity
   */
  public async update(id: number, entity: Partial<Stock>): Promise<Stock> {
    try {
      logger.info('Updating stock', { id, entity });
      const result = await this.model.update({
        where: { id },
        data: {
          ...(entity.quantity !== undefined && { quantity: entity.quantity })
        }
      });
      
      const stock = new Stock(result.storeId, result.productId, result.quantity, result.id);
      logger.info('Updated stock', { id });
      return stock;
    } catch (error) {
      logger.error('Error updating stock', error as Error, { id, entity });
      throw error;
    }
  }

  // Override findById to return domain entity
  public async findById(id: number): Promise<Stock | null> {
    try {
      logger.info('Finding stock by ID', { id });
      const result = await this.model.findUnique({
        where: { id }
      });
      
      if (!result) {
        logger.info('Stock not found', { id });
        return null;
      }
      
      const stock = new Stock(result.storeId, result.productId, result.quantity, result.id);
      logger.info('Found stock', { id });
      return stock;
    } catch (error) {
      logger.error('Error finding stock by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to return domain entities
  public async findAll(): Promise<Stock[]> {
    try {
      logger.info('Finding all stock');
      const results = await this.model.findMany();
      
      const stocks = results.map((result: any) => 
        new Stock(result.storeId, result.productId, result.quantity, result.id)
      );
      
      logger.info('Found stock records', { count: stocks.length });
      return stocks;
    } catch (error) {
      logger.error('Error finding all stock', error as Error);
      throw error;
    }
  }

  // Stock-specific methods
  public async findByStoreId(storeId: number): Promise<Stock[]> {
    try {
      logger.info('Finding stock by store ID', { storeId });
      const results = await this.model.findMany({
        where: { storeId }
      });
      
      const stocks = results.map((result: any) => 
        new Stock(result.storeId, result.productId, result.quantity, result.id)
      );
      
      logger.info('Found stock by store ID', { storeId, count: stocks.length });
      return stocks;
    } catch (error) {
      logger.error('Error finding stock by store ID', error as Error, { storeId });
      throw error;
    }
  }

  public async findByProductId(productId: number): Promise<Stock[]> {
    try {
      logger.info('Finding stock by product ID', { productId });
      const results = await this.model.findMany({
        where: { productId }
      });
      
      const stocks = results.map((result: any) => 
        new Stock(result.storeId, result.productId, result.quantity, result.id)
      );
      
      logger.info('Found stock by product ID', { productId, count: stocks.length });
      return stocks;
    } catch (error) {
      logger.error('Error finding stock by product ID', error as Error, { productId });
      throw error;
    }
  }

  public async findByStoreAndProduct(storeId: number, productId: number): Promise<Stock | null> {
    try {
      logger.info('Finding stock by store and product', { storeId, productId });
      const result = await this.model.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId
          }
        }
      });
      
      if (!result) {
        logger.info('Stock not found for store and product', { storeId, productId });
        return null;
      }
      
      const stock = new Stock(result.storeId, result.productId, result.quantity, result.id);
      logger.info('Found stock by store and product', { storeId, productId });
      return stock;
    } catch (error) {
      logger.error('Error finding stock by store and product', error as Error, { storeId, productId });
      throw error;
    }
  }

  public async findLowStock(threshold: number = 10): Promise<Stock[]> {
    try {
      logger.info('Finding low stock', { threshold });
      const results = await this.model.findMany({
        where: {
          quantity: {
            lt: threshold
          }
        }
      });
      
      const stocks = results.map((result: any) => 
        new Stock(result.storeId, result.productId, result.quantity, result.id)
      );
      
      logger.info('Found low stock records', { threshold, count: stocks.length });
      return stocks;
    } catch (error) {
      logger.error('Error finding low stock', error as Error, { threshold });
      throw error;
    }
  }

  public async adjustStock(storeId: number, productId: number, quantity: number): Promise<Stock> {
    try {
      logger.info('Adjusting stock', { storeId, productId, quantity });
      
      // Use transaction to ensure atomicity
      const result = await this.executeInTransaction(async (tx) => {
        // Find existing stock record
        const existingStock = await tx.stock.findUnique({
          where: {
            storeId_productId: {
              storeId,
              productId
            }
          }
        });

        if (!existingStock) {
          throw new Error(`Stock record not found for store ${storeId} and product ${productId}`);
        }

        const newQuantity = existingStock.quantity + quantity;
        
        if (newQuantity < 0) {
          throw new Error(`Insufficient stock. Current: ${existingStock.quantity}, Requested adjustment: ${quantity}`);
        }

        // Update the stock quantity
        const updatedStock = await tx.stock.update({
          where: {
            storeId_productId: {
              storeId,
              productId
            }
          },
          data: {
            quantity: newQuantity
          }
        });

        return updatedStock;
      });
      
      const stock = new Stock(result.storeId, result.productId, result.quantity, result.id);
      logger.info('Adjusted stock', { storeId, productId, oldQuantity: result.quantity - quantity, newQuantity: result.quantity });
      return stock;
    } catch (error) {
      logger.error('Error adjusting stock', error as Error, { storeId, productId, quantity });
      throw error;
    }
  }

  // Override batch operations to handle domain entities
  public async saveMany(entities: Omit<Stock, 'id'>[]): Promise<Stock[]> {
    try {
      logger.info('Creating multiple stock records', { count: entities.length });
      const results = await this.executeInTransaction(async (tx) => {
        const createdStocks: Stock[] = [];
        for (const entity of entities) {
          const created = await tx.stock.create({
            data: {
              storeId: entity.storeId,
              productId: entity.productId,
              quantity: entity.quantity
            }
          });
          createdStocks.push(new Stock(created.storeId, created.productId, created.quantity, created.id));
        }
        return createdStocks;
      });
      
      logger.info('Created multiple stock records', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error creating multiple stock records', error as Error, { count: entities.length });
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
    data: Stock[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      logger.info('Finding stock with pagination', { page, limit, skip });

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.model.count({ where }),
      ]);

      const stocks = data.map((result: any) => 
        new Stock(result.storeId, result.productId, result.quantity, result.id)
      );

      const totalPages = Math.ceil(total / limit);

      logger.info('Found stock with pagination', {
        count: stocks.length,
        total,
        page,
        totalPages,
      });

      return {
        data: stocks,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding stock with pagination', error as Error, { page, limit });
      throw error;
    }
  }
}