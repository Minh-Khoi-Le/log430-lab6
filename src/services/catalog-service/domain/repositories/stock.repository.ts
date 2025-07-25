import { IBaseRepository } from '../../../../shared/infrastructure/database/base-repository';
import { Stock } from '../entities/stock.entity';

/**
 * Repository interface for Stock entity persistence operations.
 * Extends the generic base repository for CRUD operations.
 */
export interface IStockRepository extends IBaseRepository<Stock, number> {
  /**
   * Finds all stock records for a given store.
   * @param storeId Store ID
   */
  findByStoreId(storeId: number): Promise<Stock[]>;

  /**
   * Finds all stock records for a given product.
   * @param productId Product ID
   */
  findByProductId(productId: number): Promise<Stock[]>;

  /**
   * Finds a stock record for a specific store and product combination.
   * @param storeId Store ID
   * @param productId Product ID
   */
  findByStoreAndProduct(storeId: number, productId: number): Promise<Stock | null>;

  /**
   * Finds stock records with quantity below a threshold.
   * @param threshold Optional quantity threshold
   */
  findLowStock(threshold?: number): Promise<Stock[]>;

  /**
   * Adjusts the stock quantity for a store and product.
   * @param storeId Store ID
   * @param productId Product ID
   * @param quantity Quantity to adjust
   */
  adjustStock(storeId: number, productId: number, quantity: number): Promise<Stock>;
}
