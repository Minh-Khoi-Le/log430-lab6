import { StockUseCases } from '../application/use-cases/stock.use-cases';
import { IStockRepository } from '../domain/repositories/stock.repository';
import { IProductRepository } from '../domain/repositories/product.repository';
import { IStoreRepository } from '../domain/repositories/store.repository';
import { Stock } from '../domain/entities/stock.entity';
import { Product } from '../domain/entities/product.entity';
import { Store } from '../domain/entities/store.entity';

// Mock the repositories
const mockStockRepository: jest.Mocked<IStockRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByStoreId: jest.fn(),
  findByProductId: jest.fn(),
  findByStoreAndProduct: jest.fn(),
  findLowStock: jest.fn(),
  adjustStock: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  saveMany: jest.fn(),
  deleteMany: jest.fn(),
  findWithPagination: jest.fn(),
};

const mockProductRepository: jest.Mocked<IProductRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByName: jest.fn(),
  findByPriceRange: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  saveMany: jest.fn(),
  deleteMany: jest.fn(),
  findWithPagination: jest.fn(),
};

const mockStoreRepository: jest.Mocked<IStoreRepository> = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByName: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  saveMany: jest.fn(),
  deleteMany: jest.fn(),
  findWithPagination: jest.fn(),
};

describe('StockUseCases', () => {
  let stockUseCases: StockUseCases;

  beforeEach(() => {
    stockUseCases = new StockUseCases(
      mockStockRepository,
      mockProductRepository,
      mockStoreRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockByStore', () => {
    it('should return stock items for a specific store', async () => {
      const storeStock = [
        new Stock(1, 10, 1, 1),
        new Stock(1, 5, 2, 2)
      ];

      mockStockRepository.findByStoreId.mockResolvedValue(storeStock);

      const result = await stockUseCases.getStockByStore(1);

      expect(result).toHaveLength(2);
      expect(result[0].storeId).toBe(1);
      expect(result[1].storeId).toBe(1);
      expect(mockStockRepository.findByStoreId).toHaveBeenCalledWith(1);
    });

    it('should return empty array when store has no stock', async () => {
      mockStockRepository.findByStoreId.mockResolvedValue([]);

      const result = await stockUseCases.getStockByStore(999);

      expect(result).toEqual([]);
    });
  });

  describe('getStockByProduct', () => {
    it('should return stock items for a specific product across all stores', async () => {
      const productStock = [
        new Stock(1, 1, 10, 1),
        new Stock(2, 1, 15, 2)
      ];

      mockStockRepository.findByProductId.mockResolvedValue(productStock);

      const result = await stockUseCases.getStockByProduct(1);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe(1);
      expect(result[1].productId).toBe(1);
      expect(mockStockRepository.findByProductId).toHaveBeenCalledWith(1);
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity successfully', async () => {
      const existingStock = new Stock(1, 1, 10, 1);
      const updatedStock = new Stock(1, 1, 20, 1);

      mockStockRepository.findById.mockResolvedValue(existingStock);
      mockStockRepository.update.mockResolvedValue(updatedStock);

      const result = await stockUseCases.updateStock(1, { quantity: 20 });

      expect(result.quantity).toBe(20);
      expect(mockStockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockStockRepository.update).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should throw error when stock item not found', async () => {
      mockStockRepository.findById.mockResolvedValue(null);

      await expect(stockUseCases.updateStock(999, { quantity: 20 }))
        .rejects.toThrow('Stock not found');
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully when sufficient quantity available', async () => {
      const existingStock = new Stock(1, 1, 10, 1);

      mockStockRepository.findByStoreAndProduct.mockResolvedValue(existingStock);
      mockStockRepository.update.mockResolvedValue(existingStock);

      const reservationDto = { storeId: 1, productId: 1, quantity: 2 };

      const result = await stockUseCases.reserveStock(reservationDto);

      expect(result).toBe(true);
      expect(mockStockRepository.findByStoreAndProduct).toHaveBeenCalledWith(1, 1);
      expect(mockStockRepository.update).toHaveBeenCalled();
    });

    it('should return false when insufficient stock available', async () => {
      const existingStock = new Stock(1, 1, 5, 1);

      mockStockRepository.findByStoreAndProduct.mockResolvedValue(existingStock);

      const reservationDto = { storeId: 1, productId: 1, quantity: 10 };

      const result = await stockUseCases.reserveStock(reservationDto);

      expect(result).toBe(false);
    });

    it('should throw error when stock item not found for reservation', async () => {
      mockStockRepository.findByStoreAndProduct.mockResolvedValue(null);

      const reservationDto = { storeId: 1, productId: 1, quantity: 2 };

      await expect(stockUseCases.reserveStock(reservationDto))
        .rejects.toThrow('Stock not found');
    });
  });

  describe('adjustStock', () => {
    it('should adjust stock quantity for restock', async () => {
      const existingStock = new Stock(1, 1, 10, 1);
      const store = new Store(1, 'Test Store', 'Test Address');
      const product = new Product(1, 'Test Product', 99.99, 'Test Description');

      mockStockRepository.adjustStock.mockResolvedValue(existingStock);
      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(product);

      const adjustmentDto = { storeId: 1, productId: 1, quantity: 15, reason: 'RESTOCK' as const };

      const result = await stockUseCases.adjustStock(adjustmentDto);

      expect(result.storeId).toBe(1);
      expect(result.productId).toBe(1);
      expect(mockStockRepository.adjustStock).toHaveBeenCalledWith(1, 1, 15);
    });

    it('should adjust stock quantity for refund', async () => {
      const existingStock = new Stock(1, 1, 10, 1);
      const store = new Store(1, 'Test Store', 'Test Address');
      const product = new Product(1, 'Test Product', 99.99, 'Test Description');

      mockStockRepository.adjustStock.mockResolvedValue(existingStock);
      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(product);

      const adjustmentDto = { storeId: 1, productId: 1, quantity: 3, reason: 'REFUND' as const };

      const result = await stockUseCases.adjustStock(adjustmentDto);

      expect(result.storeId).toBe(1);
      expect(result.productId).toBe(1);
      expect(mockStockRepository.adjustStock).toHaveBeenCalledWith(1, 1, 3);
    });

    it('should throw error when stock not found for adjustment', async () => {
      mockStockRepository.adjustStock.mockRejectedValue(new Error('Stock record not found for store 1 and product 1'));

      const adjustmentDto = { storeId: 1, productId: 1, quantity: 5, reason: 'RESTOCK' as const };

      await expect(stockUseCases.adjustStock(adjustmentDto))
        .rejects.toThrow('Stock not found');
    });
  });

  describe('getLowStockItems', () => {
    it('should return items with stock below threshold', async () => {
      const lowStockItems = [
        new Stock(1, 1, 2, 1),
        new Stock(2, 1, 1, 2)
      ];

      mockStockRepository.findLowStock.mockResolvedValue(lowStockItems);

      const result = await stockUseCases.getLowStockItems(5);

      expect(result).toHaveLength(2);
      expect(result.every((item: any) => item.quantity < 5)).toBe(true);
      expect(mockStockRepository.findLowStock).toHaveBeenCalledWith(5);
    });

    it('should use default threshold when none provided', async () => {
      mockStockRepository.findLowStock.mockResolvedValue([]);

      await stockUseCases.getLowStockItems();

      expect(mockStockRepository.findLowStock).toHaveBeenCalledWith(10); // Default threshold
    });
  });

  describe('createStock', () => {
    it('should create new stock item successfully', async () => {
      const stockData = { storeId: 1, productId: 1, quantity: 50 };
      const store = new Store(1, 'Test Store', 'Test Address');
      const product = new Product(1, 'Test Product', 99.99, 'Test Description');
      const createdStock = new Stock(1, 1, 50, 1);

      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(product);
      mockStockRepository.findByStoreAndProduct.mockResolvedValue(null); // No existing stock
      mockStockRepository.save.mockResolvedValue(createdStock);

      const result = await stockUseCases.createStock(stockData);

      expect(result.quantity).toBe(50);
      expect(mockStoreRepository.findById).toHaveBeenCalledWith(1);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockStockRepository.save).toHaveBeenCalled();
    });

    it('should throw error when store not found', async () => {
      const stockData = { storeId: 999, productId: 1, quantity: 50 };

      mockStoreRepository.findById.mockResolvedValue(null);

      await expect(stockUseCases.createStock(stockData))
        .rejects.toThrow('Store not found');
    });

    it('should throw error when product not found', async () => {
      const stockData = { storeId: 1, productId: 999, quantity: 50 };
      const store = new Store(1, 'Test Store', 'Test Address');

      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(stockUseCases.createStock(stockData))
        .rejects.toThrow('Product not found');
    });

    it('should throw error when stock already exists for store-product combination', async () => {
      const stockData = { storeId: 1, productId: 1, quantity: 50 };
      const store = new Store(1, 'Test Store', 'Test Address');
      const product = new Product(1, 'Test Product', 99.99, 'Test Description');
      const existingStock = new Stock(1, 1, 25, 1);

      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(product);
      mockStockRepository.findByStoreAndProduct.mockResolvedValue(existingStock);

      await expect(stockUseCases.createStock(stockData))
        .rejects.toThrow('Stock already exists for this product in this store');
    });
  });

  describe('business logic validation', () => {
    it('should validate quantity is non-negative', async () => {
      const existingStock = new Stock(1, 1, 10, 1);
      
      mockStockRepository.findById.mockResolvedValue(existingStock);

      await expect(stockUseCases.updateStock(1, { quantity: -5 }))
        .rejects.toThrow('Stock quantity cannot be negative');
    });

    it('should handle large quantity values', async () => {
      const stockData = { storeId: 1, productId: 1, quantity: 1000000 };
      const store = new Store(1, 'Test Store', 'Test Address');
      const product = new Product(1, 'Test Product', 99.99, 'Test Description');
      const createdStock = new Stock(1, 1, 1000000, 1);

      mockStoreRepository.findById.mockResolvedValue(store);
      mockProductRepository.findById.mockResolvedValue(product);
      mockStockRepository.findByStoreAndProduct.mockResolvedValue(null);
      mockStockRepository.save.mockResolvedValue(createdStock);

      const result = await stockUseCases.createStock(stockData);

      expect(result.quantity).toBe(1000000);
    });
  });

  describe('concurrent stock operations', () => {
    it('should handle concurrent stock reservations', async () => {
      const existingStock = new Stock(1, 1, 10, 1);
      
      mockStockRepository.findByStoreAndProduct.mockResolvedValue(existingStock);
      mockStockRepository.update.mockResolvedValue(existingStock);

      // Simulate concurrent reservations
      const reservation1 = stockUseCases.reserveStock({ storeId: 1, productId: 1, quantity: 2 });
      const reservation2 = stockUseCases.reserveStock({ storeId: 1, productId: 1, quantity: 1 });

      const results = await Promise.all([reservation1, reservation2]);

      expect(results).toHaveLength(2);
      expect(mockStockRepository.update).toHaveBeenCalledTimes(2);
    });
  });
});
