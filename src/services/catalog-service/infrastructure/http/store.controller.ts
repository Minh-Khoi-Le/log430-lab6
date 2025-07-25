import { StoreUseCases } from '../../application/use-cases/store.use-cases';

/**
 * HTTP controller for Store-related operations.
 * Handles HTTP requests and responses for store management.
 */
export class StoreController {
  /**
   * @param storeUseCases Store use cases instance for business logic
   */
  constructor(private readonly storeUseCases: StoreUseCases) {}

  /**
   * Creates a new store.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async createStore(req: any, res: any): Promise<void> {
    try {
      const store = await this.storeUseCases.createStore(req.body);
      res.status(201).json(store);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves a store by its ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const store = await this.storeUseCases.getStore(id);
      res.json(store);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves all stores.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getAllStores(req: any, res: any): Promise<void> {
    try {
      const stores = await this.storeUseCases.getAllStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Updates an existing store.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async updateStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const store = await this.storeUseCases.updateStore(id, req.body);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Deletes a store by its ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async deleteStore(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.storeUseCases.deleteStore(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async searchStores(req: any, res: any): Promise<void> {
    try {
      const name = req.query.name as string;
      const stores = await this.storeUseCases.searchStores(name);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
