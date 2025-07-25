import { IProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/entities/product.entity';

describe('IProductRepository Contract Tests', () => {
  let mockRepository: jest.Mocked<IProductRepository>;

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
      
      // Product-specific methods
      findByName: jest.fn(),
      findByPriceRange: jest.fn(),
    };
  });

  describe('Base Repository Contract', () => {
    it('should have findById method that returns Product or null', async () => {
      const product = new Product(1, 'Test Product', 10.99, 'Test Description');
      mockRepository.findById.mockResolvedValue(product);

      const result = await mockRepository.findById(1);
      
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(product);
    });

    it('should have findAll method that returns array of Products', async () => {
      const products = [
        new Product(1, 'Product 1', 10.99),
        new Product(2, 'Product 2', 15.99)
      ];
      mockRepository.findAll.mockResolvedValue(products);

      const result = await mockRepository.findAll();
      
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(products);
    });

    it('should have save method that creates new Product', async () => {
      const newProduct = new Product(0, 'New Product', 20.99, 'New Description');
      const savedProduct = new Product(1, 'New Product', 20.99, 'New Description');
      mockRepository.save.mockResolvedValue(savedProduct);

      const result = await mockRepository.save(newProduct);
      
      expect(mockRepository.save).toHaveBeenCalledWith(newProduct);
      expect(result).toEqual(savedProduct);
    });

    it('should have update method that modifies existing Product', async () => {
      const updates = { name: 'Updated Product', price: 25.99 };
      const updatedProduct = new Product(1, 'Updated Product', 25.99, 'Test Description');
      mockRepository.update.mockResolvedValue(updatedProduct);

      const result = await mockRepository.update(1, updates);
      
      expect(mockRepository.update).toHaveBeenCalledWith(1, updates);
      expect(result).toEqual(updatedProduct);
    });

    it('should have delete method that removes Product', async () => {
      mockRepository.delete.mockResolvedValue();

      await mockRepository.delete(1);
      
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should have exists method that checks Product existence', async () => {
      mockRepository.exists.mockResolvedValue(true);

      const result = await mockRepository.exists(1);
      
      expect(mockRepository.exists).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should have count method that returns total number of Products', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await mockRepository.count();
      
      expect(mockRepository.count).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('Product-Specific Contract', () => {
    it('should have findByName method that returns Products matching name', async () => {
      const products = [new Product(1, 'Test Product', 10.99)];
      mockRepository.findByName.mockResolvedValue(products);

      const result = await mockRepository.findByName('Test Product');
      
      expect(mockRepository.findByName).toHaveBeenCalledWith('Test Product');
      expect(result).toEqual(products);
    });

    it('should have findByPriceRange method that returns Products within price range', async () => {
      const products = [
        new Product(1, 'Product 1', 15.99),
        new Product(2, 'Product 2', 20.99)
      ];
      mockRepository.findByPriceRange.mockResolvedValue(products);

      const result = await mockRepository.findByPriceRange(10, 25);
      
      expect(mockRepository.findByPriceRange).toHaveBeenCalledWith(10, 25);
      expect(result).toEqual(products);
    });
  });

  describe('Pagination Contract', () => {
    it('should have findWithPagination method that returns paginated results', async () => {
      const paginatedResult = {
        data: [new Product(1, 'Product 1', 10.99)],
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
    it('should have saveMany method that creates multiple Products', async () => {
      const newProducts = [
        new Product(0, 'Product 1', 10.99),
        new Product(0, 'Product 2', 15.99)
      ];
      const savedProducts = [
        new Product(1, 'Product 1', 10.99),
        new Product(2, 'Product 2', 15.99)
      ];
      mockRepository.saveMany.mockResolvedValue(savedProducts);

      const result = await mockRepository.saveMany(newProducts);
      
      expect(mockRepository.saveMany).toHaveBeenCalledWith(newProducts);
      expect(result).toEqual(savedProducts);
    });

    it('should have deleteMany method that removes multiple Products', async () => {
      mockRepository.deleteMany.mockResolvedValue();

      await mockRepository.deleteMany([1, 2, 3]);
      
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([1, 2, 3]);
    });
  });
});