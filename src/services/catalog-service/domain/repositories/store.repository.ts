import { Store } from '../entities/store.entity';
import { IBaseRepository } from '../../../../shared/infrastructure/database/base-repository';

/**
 * Repository interface for Store entity persistence operations.
 * Extends the generic base repository for CRUD operations.
 */
export interface IStoreRepository extends IBaseRepository<Store, number> {
  /**
   * Finds stores by their name.
   * @param name Store name to search for
   * @returns Promise resolving to an array of matching Store entities
   */
  findByName(name: string): Promise<Store[]>;
}
