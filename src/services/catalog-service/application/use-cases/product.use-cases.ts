import { IStoreRepository } from '../../domain/repositories/store.repository';
import { IStockRepository } from '../../domain/repositories/stock.repository';
import { IProductRepository } from '../../domain/repositories/product.repository';
import { CreateProductDTO, UpdateProductDTO, ProductResponseDTO } from '../dtos/product.dto';
import { Product } from '../../domain/entities/product.entity';
import { Stock } from '../../domain/entities/stock.entity';

/**
 * Use case class for managing product operations (CRUD).
 * Handles business logic for product creation, updates, and stock initialization.
 */
export class ProductUseCases {
  /**
   * @param productRepository Repository for product persistence operations
   * @param storeRepository Repository for store data
   * @param stockRepository Repository for stock data
   */
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly storeRepository: IStoreRepository,
    private readonly stockRepository: IStockRepository
  ) {}

  /**
   * Creates a new product and initializes stock for all stores.
   * @param dto Data Transfer Object for product creation
   */
  async createProduct(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    const product = new Product(0, dto.name, dto.price, dto.description);
    // Validate product entity
    if (!product.isValid()) {
      throw new Error('Invalid product data');
    }
    // Prepare and save product data
    const productData = Product.fromData({ name: dto.name, price: dto.price, description: dto.description });
    const savedProduct = await this.productRepository.save(productData);
    // Create stock record for every store
    const stores = await this.storeRepository.findAll();
    await Promise.all(
      stores.map(store =>
        this.stockRepository.save(Stock.fromData({ storeId: store.id, productId: savedProduct.id, quantity: 0 }))
      )
    );
    return this.toResponseDTO(savedProduct);
  }

  /**
   * Updates an existing product's details and price.
   * @param id Product ID
   * @param dto Data Transfer Object for product update
   */
  async updateProduct(id: number, dto: UpdateProductDTO): Promise<ProductResponseDTO> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }
    // Update product price if provided
    if (dto.price !== undefined) {
      existingProduct.updatePrice(dto.price);
    }
    // Update product details if provided
    if (dto.name !== undefined || dto.description !== undefined) {
      existingProduct.updateDetails(dto.name, dto.description);
    }
    const updatedProduct = await this.productRepository.update(id, existingProduct);
    return this.toResponseDTO(updatedProduct);
  }

  /**
   * Retrieves a product by its ID.
   * @param id Product ID
   */
  async getProduct(id: number): Promise<ProductResponseDTO> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return this.toResponseDTO(product);
  }

  /**
   * Retrieves all products.
   */
  async getAllProducts(): Promise<ProductResponseDTO[]> {
    const products = await this.productRepository.findAll();
    return products.map(product => this.toResponseDTO(product));
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    // Delete all stock records for this product before deleting the product itself
    const stocks = await this.stockRepository.findByProductId(id);
    await Promise.all(stocks.map(stock => this.stockRepository.delete(stock.id)));
    await this.productRepository.delete(id);
  }

  async searchProducts(name: string): Promise<ProductResponseDTO[]> {
    const products = await this.productRepository.findByName(name);
    return products.map(product => this.toResponseDTO(product));
  }

  private toResponseDTO(product: Product): ProductResponseDTO {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description ?? ''
    };
  }
}
