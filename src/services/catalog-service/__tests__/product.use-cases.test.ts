import { ProductUseCases } from '../application/use-cases/product.use-cases';
import { IProductRepository } from '../domain/repositories/product.repository';
import { IStoreRepository } from '../domain/repositories/store.repository';
import { IStockRepository } from '../domain/repositories/stock.repository';
import { Product } from '../domain/entities/product.entity';
import { Store } from '../domain/entities/store.entity';
import { Stock } from '../domain/entities/stock.entity';

// Mock the repositories
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

describe('ProductUseCases', () => {
  let productUseCases: ProductUseCases;

  beforeEach(() => {
    productUseCases = new ProductUseCases(
      mockProductRepository,
      mockStoreRepository,
      mockStockRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a product and initialize stock for all stores', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        description: 'A test product'
      };

      const stores = [
        new Store(1, 'Store 1', 'Address 1'),
        new Store(2, 'Store 2', 'Address 2')
      ];

      const savedProduct = new Product(1, 'Test Product', 99.99, 'A test product');

      mockStoreRepository.findAll.mockResolvedValue(stores);
      mockProductRepository.save.mockResolvedValue(savedProduct);
      mockStockRepository.save.mockResolvedValue(new Stock(1, 1, 0));

      const result = await productUseCases.createProduct(productData);

      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          price: 99.99,
          description: 'A test product'
        })
      );

      expect(mockStoreRepository.findAll).toHaveBeenCalled();
      expect(mockStockRepository.save).toHaveBeenCalledTimes(2);
      
      expect(result).toEqual({
        id: 1,
        name: 'Test Product',
        price: 99.99,
        description: 'A test product'
      });
    });

    it('should throw error for invalid product data', async () => {
      const invalidProductData = {
        name: '',
        price: -10,
        description: 'Invalid product'
      };

      await expect(productUseCases.createProduct(invalidProductData))
        .rejects.toThrow('Invalid product data');
    });
  });

  describe('getProduct', () => {
    it('should return product when found', async () => {
      const product = new Product(1, 'Test Product', 99.99, 'A test product');
      mockProductRepository.findById.mockResolvedValue(product);

      const result = await productUseCases.getProduct(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test Product',
        price: 99.99,
        description: 'A test product'
      });
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productUseCases.getProduct(999))
        .rejects.toThrow('Product not found');
    });
  });

  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const products = [
        new Product(1, 'Product 1', 99.99, 'Description 1'),
        new Product(2, 'Product 2', 149.99, 'Description 2')
      ];

      mockProductRepository.findAll.mockResolvedValue(products);

      const result = await productUseCases.getAllProducts();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Product 1',
        price: 99.99,
        description: 'Description 1'
      });
      expect(mockProductRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no products exist', async () => {
      mockProductRepository.findAll.mockResolvedValue([]);

      const result = await productUseCases.getAllProducts();

      expect(result).toEqual([]);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const existingProduct = new Product(1, 'Old Name', 99.99, 'Old Description');
      const updatedProduct = new Product(1, 'New Name', 149.99, 'New Description');

      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const updateData = {
        name: 'New Name',
        price: 149.99,
        description: 'New Description'
      };

      const result = await productUseCases.updateProduct(1, updateData);

      expect(result).toEqual({
        id: 1,
        name: 'New Name',
        price: 149.99,
        description: 'New Description'
      });
      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockProductRepository.update).toHaveBeenCalledWith(1, expect.any(Product));
    });

    it('should throw error when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productUseCases.updateProduct(999, { name: 'New Name' }))
        .rejects.toThrow('Product not found');
    });

    it('should handle partial updates', async () => {
      const existingProduct = new Product(1, 'Old Name', 99.99, 'Old Description');
      const updatedProduct = new Product(1, 'Old Name', 149.99, 'Old Description');

      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.update.mockResolvedValue(updatedProduct);

      const result = await productUseCases.updateProduct(1, { price: 149.99 });

      expect(result.price).toBe(149.99);
      expect(result.name).toBe('Old Name'); // Should remain unchanged
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const existingProduct = new Product(1, 'Test Product', 99.99, 'Description');
      
      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockStockRepository.findByProductId.mockResolvedValue([]);
      mockProductRepository.delete.mockResolvedValue(undefined);

      await productUseCases.deleteProduct(1);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(1);
      expect(mockStockRepository.findByProductId).toHaveBeenCalledWith(1);
      expect(mockProductRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productUseCases.deleteProduct(999))
        .rejects.toThrow('Product not found');
    });
  });

  describe('searchProducts', () => {
    it('should return products matching search query', async () => {
      const products = [
        new Product(1, 'Laptop Computer', 999.99, 'High-end laptop'),
        new Product(2, 'Desktop Computer', 799.99, 'Desktop PC')
      ];

      mockProductRepository.findByName.mockResolvedValue(products);

      const result = await productUseCases.searchProducts('Computer');

      expect(result).toHaveLength(2);
      expect(mockProductRepository.findByName).toHaveBeenCalledWith('Computer');
    });

    it('should return empty array when no products match', async () => {
      mockProductRepository.findByName.mockResolvedValue([]);

      const result = await productUseCases.searchProducts('NonExistentProduct');

      expect(result).toEqual([]);
    });
  });

  describe('business logic validation', () => {
    it('should validate product price is positive', async () => {
      const invalidProduct = {
        name: 'Test Product',
        price: -50,
        description: 'Invalid price'
      };

      await expect(productUseCases.createProduct(invalidProduct))
        .rejects.toThrow('Invalid product data');
    });

    it('should validate product name is not empty', async () => {
      const invalidProduct = {
        name: '',
        price: 99.99,
        description: 'Empty name'
      };

      await expect(productUseCases.createProduct(invalidProduct))
        .rejects.toThrow('Invalid product data');
    });
  });
});
