import { IBaseRepository } from '../../../../shared/infrastructure/database/base-repository';
import { Product } from '../entities/product.entity';

/**
 * Repository interface for Product entity persistence operations.
 * Extends the generic base repository for CRUD operations.
 */
export interface IProductRepository extends IBaseRepository<Product, number> {
  /**
   * Finds products by their name.
   * @param name Product name to search for
   * @returns Promise resolving to an array of matching Product entities
   */
  findByName(name: string): Promise<Product[]>;

  /**
   * Finds products within a price range.
   * @param min Minimum price
   * @param max Maximum price
   * @returns Promise resolving to an array of matching Product entities
   */
  findByPriceRange(min: number, max: number): Promise<Product[]>;
}
