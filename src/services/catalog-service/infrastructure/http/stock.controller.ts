import { StockUseCases } from '../../application/use-cases/stock.use-cases';

/**
 * HTTP controller for Stock-related operations.
 * Handles HTTP requests and responses for stock management.
 */
export class StockController {
  /**
   * @param stockUseCases Stock use cases instance for business logic
   */
  constructor(private readonly stockUseCases: StockUseCases) {}

  /**
   * Creates a new stock record.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async createStock(req: any, res: any): Promise<void> {
    try {
      const stock = await this.stockUseCases.createStock(req.body);
      res.status(201).json(stock);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves a stock record by its ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getStock(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const stock = await this.stockUseCases.getStock(id);
      res.json(stock);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves all stock records.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getAllStock(req: any, res: any): Promise<void> {
    try {
      const stocks = await this.stockUseCases.getAllStock();
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Updates an existing stock record.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async updateStock(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const stock = await this.stockUseCases.updateStock(id, req.body);
      res.json(stock);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves stock records by store ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getStockByStore(req: any, res: any): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);
      const stocks = await this.stockUseCases.getStockByStore(storeId);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getStockByProduct(req: any, res: any): Promise<void> {
    try {
      const productId = parseInt(req.params.productId);
      const stocks = await this.stockUseCases.getStockByProduct(productId);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async reserveStock(req: any, res: any): Promise<void> {
    try {
      const success = await this.stockUseCases.reserveStock(req.body);
      res.json({ success });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async adjustStock(req: any, res: any): Promise<void> {
    try {
      const stock = await this.stockUseCases.adjustStock(req.body);
      res.json(stock);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getLowStockItems(req: any, res: any): Promise<void> {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const stocks = await this.stockUseCases.getLowStockItems(threshold);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
