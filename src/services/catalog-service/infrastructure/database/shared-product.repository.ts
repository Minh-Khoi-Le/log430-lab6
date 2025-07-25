import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('shared-product-repository');

/**
 * Shared repository implementation for Product entities.
 * Provides database persistence operations for products using a shared database.
 */
export class SharedProductRepository extends BaseRepository<Product, number> implements IProductRepository {
  /**
   * @param databaseManager Database manager instance for database operations
   */
  constructor(databaseManager: IDatabaseManager) {
    super(databaseManager, 'product');
  }

  /**
   * Creates a new product entity in the database.
   * Override save method to handle entity creation properly.
   * @param entity Product entity without ID
   * @returns Promise resolving to the created Product entity
   */
  public async save(entity: Omit<Product, 'id'>): Promise<Product> {
    try {
      logger.info('Creating new product', { entity });
      const result = await this.model.create({
        data: {
          name: entity.name,
          price: entity.price,
          description: entity.description
        }
      });
      
      const product = new Product(result.id, result.name, result.price, result.description ?? undefined);
      logger.info('Created product', { id: result.id });
      return product;
    } catch (error) {
      logger.error('Error creating product', error as Error, { entity });
      throw error;
    }
  }

  /**
   * Updates an existing product entity in the database.
   * Override update method to handle partial updates properly.
   * @param id Product ID
   * @param entity Partial product entity with updated fields
   * @returns Promise resolving to the updated Product entity
   */
  public async update(id: number, entity: Partial<Product>): Promise<Product> {
    try {
      logger.info('Updating product', { id, entity });
      const result = await this.model.update({
        where: { id },
        data: {
          ...(entity.name && { name: entity.name }),
          ...(entity.price !== undefined && { price: entity.price }),
          ...(entity.description !== undefined && { description: entity.description })
        }
      });
      
      const product = new Product(result.id, result.name, result.price, result.description ?? undefined);
      logger.info('Updated product', { id });
      return product;
    } catch (error) {
      logger.error('Error updating product', error as Error, { id, entity });
      throw error;
    }
  }

  // Override findById to return domain entity
  public async findById(id: number): Promise<Product | null> {
    try {
      logger.info('Finding product by ID', { id });
      const result = await this.model.findUnique({
        where: { id }
      });
      
      if (!result) {
        logger.info('Product not found', { id });
        return null;
      }
      
      const product = new Product(result.id, result.name, result.price, result.description ?? undefined);
      logger.info('Found product', { id });
      return product;
    } catch (error) {
      logger.error('Error finding product by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to return domain entities
  public async findAll(): Promise<Product[]> {
    try {
      logger.info('Finding all products');
      const results = await this.model.findMany();
      
      const products = results.map((result: any) => 
        new Product(result.id, result.name, result.price, result.description ?? undefined)
      );
      
      logger.info('Found products', { count: products.length });
      return products;
    } catch (error) {
      logger.error('Error finding all products', error as Error);
      throw error;
    }
  }

  // Product-specific methods
  public async findByName(name: string): Promise<Product[]> {
    try {
      logger.info('Finding products by name', { name });
      const results = await this.model.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        }
      });
      
      const products = results.map((result: any) => 
        new Product(result.id, result.name, result.price, result.description ?? undefined)
      );
      
      logger.info('Found products by name', { name, count: products.length });
      return products;
    } catch (error) {
      logger.error('Error finding products by name', error as Error, { name });
      throw error;
    }
  }

  public async findByPriceRange(min: number, max: number): Promise<Product[]> {
    try {
      logger.info('Finding products by price range', { min, max });
      const results = await this.model.findMany({
        where: {
          price: {
            gte: min,
            lte: max
          }
        }
      });
      
      const products = results.map((result: any) => 
        new Product(result.id, result.name, result.price, result.description ?? undefined)
      );
      
      logger.info('Found products by price range', { min, max, count: products.length });
      return products;
    } catch (error) {
      logger.error('Error finding products by price range', error as Error, { min, max });
      throw error;
    }
  }

  // Override batch operations to handle domain entities
  public async saveMany(entities: Omit<Product, 'id'>[]): Promise<Product[]> {
    try {
      logger.info('Creating multiple products', { count: entities.length });
      const results = await this.executeInTransaction(async (tx) => {
        const createdProducts: Product[] = [];
        for (const entity of entities) {
          const created = await tx.product.create({
            data: {
              name: entity.name,
              price: entity.price,
              description: entity.description
            }
          });
          createdProducts.push(new Product(created.id, created.name, created.price, created.description ?? undefined));
        }
        return createdProducts;
      });
      
      logger.info('Created multiple products', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error creating multiple products', error as Error, { count: entities.length });
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
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      logger.info('Finding products with pagination', { page, limit, skip });

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.model.count({ where }),
      ]);

      const products = data.map((result: any) => 
        new Product(result.id, result.name, result.price, result.description ?? undefined)
      );

      const totalPages = Math.ceil(total / limit);

      logger.info('Found products with pagination', {
        count: products.length,
        total,
        page,
        totalPages,
      });

      return {
        data: products,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding products with pagination', error as Error, { page, limit });
      throw error;
    }
  }
}