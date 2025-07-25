import { IProductRepository } from '../../domain/repositories/product.repository';
import { IStoreRepository } from '../../domain/repositories/store.repository';
import { IStockRepository } from '../../domain/repositories/stock.repository';
import { CreateStockDTO, UpdateStockDTO, StockResponseDTO, StockReservationDTO, StockAdjustmentDTO } from '../dtos/stock.dto';
import { Stock } from '../../domain/entities/stock.entity';

/**
 * Use case class for managing stock operations (CRUD, reservation, adjustment).
 * Handles business logic for stock creation, updates, reservations, and adjustments.
 */
export class StockUseCases {
  /**
   * @param stockRepository Repository for stock persistence operations
   * @param productRepository Repository for product data
   * @param storeRepository Repository for store data
   */
  constructor(
    private readonly stockRepository: IStockRepository,
    private readonly productRepository: IProductRepository,
    private readonly storeRepository: IStoreRepository
  ) {}

  /**
   * Creates a new stock record for a product in a store.
   * Validates existence of store and product, and checks for duplicate stock.
   * @param dto Data Transfer Object for stock creation
   */
  async createStock(dto: CreateStockDTO): Promise<StockResponseDTO> {
    // Validate store and product exist
    const store = await this.storeRepository.findById(dto.storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new Error('Product not found');
    }
    // Check if stock already exists
    const existingStock = await this.stockRepository.findByStoreAndProduct(dto.storeId, dto.productId);
    if (existingStock) {
      throw new Error('Stock already exists for this product in this store');
    }
    // Prepare and save stock data
    const stockData = Stock.fromData({ storeId: dto.storeId, productId: dto.productId, quantity: dto.quantity });
    const savedStock = await this.stockRepository.save(stockData);
    return this.toResponseDTO(savedStock, store.name, product.name, product.price);
  }

  /**
   * Updates the quantity of an existing stock record.
   * @param id Stock ID
   * @param dto Data Transfer Object for stock update
   */
  async updateStock(id: number, dto: UpdateStockDTO): Promise<StockResponseDTO> {
    const existingStock = await this.stockRepository.findById(id);
    if (!existingStock) {
      throw new Error('Stock not found');
    }
    // Update stock quantity and persist
    existingStock.updateQuantity(dto.quantity);
    const updatedStock = await this.stockRepository.update(id, existingStock);
    // Get related data for response
    const store = await this.storeRepository.findById(updatedStock.storeId);
    const product = await this.productRepository.findById(updatedStock.productId);
    return this.toResponseDTO(updatedStock, store?.name, product?.name, product?.price);
  }

  /**
   * Retrieves a stock record by its ID, including related store and product info.
   * @param id Stock ID
   */
  async getStock(id: number): Promise<StockResponseDTO> {
    const stock = await this.stockRepository.findById(id);
    if (!stock) {
      throw new Error('Stock not found');
    }
    const store = await this.storeRepository.findById(stock.storeId);
    const product = await this.productRepository.findById(stock.productId);
    return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
  }

  /**
   * Retrieves all stock records.
   */
  async getAllStock(): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findAll();
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async getStockByStore(storeId: number): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findByStoreId(storeId);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async getStockByProduct(productId: number): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findByProductId(productId);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  async reserveStock(dto: StockReservationDTO): Promise<boolean> {
    const stock = await this.stockRepository.findByStoreAndProduct(dto.storeId, dto.productId);
    if (!stock) {
      throw new Error('Stock not found');
    }

    const success = stock.reserve(dto.quantity);
    if (success) {
      await this.stockRepository.update(stock.id, stock);
    }
    
    return success;
  }

  async adjustStock(dto: StockAdjustmentDTO): Promise<StockResponseDTO> {
    // Use the shared repository's adjustStock method for atomic operations
    const adjustmentQuantity = dto.reason === 'REFUND' ? dto.quantity : dto.quantity;
    
    try {
      const updatedStock = await this.stockRepository.adjustStock(dto.storeId, dto.productId, adjustmentQuantity);
      const store = await this.storeRepository.findById(updatedStock.storeId);
      const product = await this.productRepository.findById(updatedStock.productId);
      return this.toResponseDTO(updatedStock, store?.name, product?.name, product?.price);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Stock record not found')) {
        throw new Error('Stock not found');
      }
      throw error;
    }
  }

  async getLowStockItems(threshold: number = 10): Promise<StockResponseDTO[]> {
    const stocks = await this.stockRepository.findLowStock(threshold);
    return Promise.all(stocks.map(async (stock) => {
      const store = await this.storeRepository.findById(stock.storeId);
      const product = await this.productRepository.findById(stock.productId);
      return this.toResponseDTO(stock, store?.name, product?.name, product?.price);
    }));
  }

  private toResponseDTO(stock: Stock, storeName?: string, productName?: string, unitPrice?: number): StockResponseDTO {
    return {
      id: stock.id,
      storeId: stock.storeId,
      productId: stock.productId,
      quantity: stock.quantity,
      storeName: storeName ?? '',
      productName: productName ?? '',
      unitPrice: unitPrice ?? 0
    };
  }
}
