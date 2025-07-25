import { IStoreRepository } from '../../domain/repositories/store.repository';
import { Store } from '../../domain/entities/store.entity';

describe('IStoreRepository Contract Tests', () => {
  let mockRepository: jest.Mocked<IStoreRepository>;

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
      
      // Store-specific methods
      findByName: jest.fn(),
    };
  });

  describe('Base Repository Contract', () => {
    it('should have findById method that returns Store or null', async () => {
      const store = new Store(1, 'Test Store', '123 Main St');
      mockRepository.findById.mockResolvedValue(store);

      const result = await mockRepository.findById(1);
      
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(store);
    });

    it('should have findAll method that returns array of Stores', async () => {
      const stores = [
        new Store(1, 'Store 1', '123 Main St'),
        new Store(2, 'Store 2', '456 Oak Ave')
      ];
      mockRepository.findAll.mockResolvedValue(stores);

      const result = await mockRepository.findAll();
      
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(stores);
    });

    it('should have save method that creates new Store', async () => {
      const newStore = new Store(0, 'New Store', '789 Pine St');
      const savedStore = new Store(1, 'New Store', '789 Pine St');
      mockRepository.save.mockResolvedValue(savedStore);

      const result = await mockRepository.save(newStore);
      
      expect(mockRepository.save).toHaveBeenCalledWith(newStore);
      expect(result).toEqual(savedStore);
    });

    it('should have update method that modifies existing Store', async () => {
      const updates = { name: 'Updated Store', address: '999 Elm St' };
      const updatedStore = new Store(1, 'Updated Store', '999 Elm St');
      mockRepository.update.mockResolvedValue(updatedStore);

      const result = await mockRepository.update(1, updates);
      
      expect(mockRepository.update).toHaveBeenCalledWith(1, updates);
      expect(result).toEqual(updatedStore);
    });

    it('should have delete method that removes Store', async () => {
      mockRepository.delete.mockResolvedValue();

      await mockRepository.delete(1);
      
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should have exists method that checks Store existence', async () => {
      mockRepository.exists.mockResolvedValue(true);

      const result = await mockRepository.exists(1);
      
      expect(mockRepository.exists).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should have count method that returns total number of Stores', async () => {
      mockRepository.count.mockResolvedValue(3);

      const result = await mockRepository.count();
      
      expect(mockRepository.count).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });

  describe('Store-Specific Contract', () => {
    it('should have findByName method that returns Stores matching name', async () => {
      const stores = [new Store(1, 'Test Store', '123 Main St')];
      mockRepository.findByName.mockResolvedValue(stores);

      const result = await mockRepository.findByName('Test Store');
      
      expect(mockRepository.findByName).toHaveBeenCalledWith('Test Store');
      expect(result).toEqual(stores);
    });
  });

  describe('Pagination Contract', () => {
    it('should have findWithPagination method that returns paginated results', async () => {
      const paginatedResult = {
        data: [new Store(1, 'Store 1', '123 Main St')],
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
    it('should have saveMany method that creates multiple Stores', async () => {
      const newStores = [
        new Store(0, 'Store 1', '123 Main St'),
        new Store(0, 'Store 2', '456 Oak Ave')
      ];
      const savedStores = [
        new Store(1, 'Store 1', '123 Main St'),
        new Store(2, 'Store 2', '456 Oak Ave')
      ];
      mockRepository.saveMany.mockResolvedValue(savedStores);

      const result = await mockRepository.saveMany(newStores);
      
      expect(mockRepository.saveMany).toHaveBeenCalledWith(newStores);
      expect(result).toEqual(savedStores);
    });

    it('should have deleteMany method that removes multiple Stores', async () => {
      mockRepository.deleteMany.mockResolvedValue();

      await mockRepository.deleteMany([1, 2, 3]);
      
      expect(mockRepository.deleteMany).toHaveBeenCalledWith([1, 2, 3]);
    });
  });
});