import { ProductUseCases } from '../../application/use-cases/product.use-cases';

/**
 * HTTP controller for Product-related operations.
 * Handles HTTP requests and responses for product management.
 */
export class ProductController {
  /**
   * @param productUseCases Product use cases instance for business logic
   */
  constructor(private readonly productUseCases: ProductUseCases) {}

  /**
   * Creates a new product.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async createProduct(req: any, res: any): Promise<void> {
    try {
      const product = await this.productUseCases.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves a product by its ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productUseCases.getProduct(id);
      res.json(product);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Retrieves all products.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getAllProducts(req: any, res: any): Promise<void> {
    try {
      const products = await this.productUseCases.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Updates an existing product.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async updateProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const product = await this.productUseCases.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Deletes a product by its ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async deleteProduct(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.productUseCases.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async searchProducts(req: any, res: any): Promise<void> {
    try {
      const name = req.query.name as string;
      const products = await this.productUseCases.searchProducts(name);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
