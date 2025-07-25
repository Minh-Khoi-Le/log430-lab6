import { IStockRepository } from '../../domain/repositories/stock.repository';
import { Stock } from '../../domain/entities/stock.entity';

describe('IStockRepository Contract Tests', () => {
  let mockRepository: jest.Mocked<IStockRepository>;

  beforeEach(() => {
    mockRepository = {
      // Base repository methods
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      count: jest.fn(),
      saveMany: jest.fn(),
      deleteMany: jest.fn(),
      findWithPagination: jest.fn(),
      
      // Stock-specific methods
      findByStoreId: jest.fn(),
      findByProductId: jest.fn(),
      findByStoreAndProduct: jest.fn(),
      findLowStock: jest.fn(),
      adjustStock: jest.fn(),
    };
  });

  describe('Base Repository Contract', () => {
    it('should have findById method that returns Stock or null', async () => {
      const stock = new Stock(1, 1, 50, 1);
      mockRepository.findById.mockResolvedValue(stock);

      const result = await mockRepository.findById(1);
      
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(stock);
    });

    it('should have findAll method that returns array of Stock', async () => {
      const stocks = [
        new Stock(1, 1, 50, 1),
        new Stock(1, 2, 25, 2)
      ];
      mockRepository.findAll.mockResolvedValue(stocks);

      const result = await mockRepository.findAll();
      
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(stocks);
    });

    it('should have save method that creates new Stock', async () => {
      const newStock = new Stock(1, 1, 100, 0);
      const savedStock = new Stock(1, 1, 100, 1);
      mockRepository.save.mockResolvedValue(savedStock);

      const result = await mockRepository.save(newStock);
      
      expect(mockRepository.save).toHaveBeenCalledWith(newStock);
      expect(result).toEqual(savedStock);
    });

    it('should have update method that modifies existing Stock', async () => {
      const updates = { quantity: 75 };
      const updatedStock = new Stock(1, 1, 75, 1);
      mockRepository.update.mockResolvedValue(updatedStock);

      const result = await mockRepository.update(1, updates);
      
      expect(mockRepository.update).toHaveBeenCalledWith(1, updates);
      expect(result).toEqual(updatedStock);
    });

    it('should have delete method that removes Stock', async () => {
      mockRepository.delete.mockResolvedValue();

      await mockRepository.delete(1);
      
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should have exists method that checks Stock existence', async () => {
      mockRepository.exists.mockResolvedValue(true);

      const result = await mockRepository.exists(1);
      
      expect(mockRepository.exists).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should have count method that returns total number of Stock records', async () => {
      mockRepository.count.mockResolvedValue(10);

      const result = await mockRepository.count();
      
      expect(mockRepository.count).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });

  describe('Stock-Specific Contract', () => {
    it('should have findByStoreId method that returns Stock for specific store', async () => {
      const stocks = [
        new Stock(1, 1, 50, 1),
        new Stock(1, 2, 25, 2)
      ];
      mockRepository.findByStoreId.mockResolvedValue(stocks);

      const result = await mockRepository.findByStoreId(1);
      
      expect(mockRepository.findByStoreId).toHaveBeenCalledWith(1);
      expect(result).toEqual(stocks);
    });

    it('should have findByProductId method that returns Stock for specific product', async () => {
      const stocks = [
        new Stock(1, 1, 50, 1),
        new Stock(2, 1, 30, 2)
      ];
      mockRepository.findByProductId.mockResolvedValue(stocks);

      const result = await mockRepository.findByProductId(1);
      
      expect(mockRepository.findByProductId).toHaveBeenCalledWith(1);
      expect(result).toEqual(stocks);
    });

    it('should have findByStoreAndProduct method that returns specific Stock record', async () => {
      const stock = new Stock(1, 1, 50, 1);
      mockRepository.findByStoreAndProduct.mockResolvedValue(stock);

      const result = await mockRepository.findByStoreAndProduct(1, 1);
      
      expect(mockRepository.findByStoreAndProduct).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual(stock);
    });

    it('should have findLowStock method that returns Stock below threshold', async () => {
      const lowStocks = [
        new Stock(1, 1, 5, 1),
        new Stock(2, 2, 3, 2)
      ];
      mockRepository.findLowStock.mockResolvedValue(lowStocks);

      const result = await mockRepository.findLowStock(10);
      
      expect(mockRepository.findLowStock).toHaveBeenCalledWith(10);
      expect(result).toEqual(lowStocks);
    });

    it('should have findLowStock method with default threshold', async () => {
      const lowStocks = [new Stock(1, 1, 5, 1)];
      mockRepository.findLowStock.mockResolvedValue(lowStocks);

      const result = await mockRepository.findLowStock();
      
      expect(mockRepository.findLowStock).toHaveBeenCalledWith();
      expect(result).toEqual(lowStocks);
    });

    it('should have adjustStock method that modifies stock quantity', async () => {
      const adjustedStock = new Stock(1, 1, 45, 1);
      mockRepository.adjustStock.mockResolvedValue(adjustedStock);

      const result = await mockRepository.adjustStock(1, 1, -5);
      
      expect(mockRepository.adjustStock).toHaveBeenCalledWith(1, 1, -5);
      expect(result).toEqual(adjustedStock);
    });
  });

  describe('Pagination Contract', () => {
    it('should have findWithPagination method that returns paginated results', async () => {
      const paginatedResult = {
        data: [new Stock(1, 1, 50, 1)],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockRepository.findWithPagination.mockResolvedValue(paginatedResult);

      const result = await mockRepository.findWithPagination(1, 10);
      
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('Batch Operations Contract', () => {
    it('should have saveMany method that creates multiple Stock records', async () => {
      const newStocks = [
        new Stock(1, 1, 50, 0),
        new Stock(1, 2, 25, 0)
      ];
      const savedStocks = [
        new Stock(1, 1, 50, 1),
        new Stock(1, 2, 25, 2)
      ];
      mockRepository.saveMany.mockResolvedValue(savedStocks);

      const result = await mockRepository.saveMany(newStocks);
      
      expect(mockRepository.saveMany).toHaveBeenCalledWith(newStocks);
      expect(result).toEqual(savedStocks);
    });

    it('should have deleteMany method that removes multiple Stock records', async () => {
      mockRepository.deleteMany.mockResolvedValue();

      await mockRepository.deleteMany([1, 2, 3]);
      
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([1, 2, 3]);
    });
  });
});