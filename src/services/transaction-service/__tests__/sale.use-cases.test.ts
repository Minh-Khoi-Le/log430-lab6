import { SaleUseCases } from '../application/use-cases/sale.use-cases';
import { ISaleRepository } from '../domain/repositories/sale.repository';
import { Sale } from '../domain/entities/sale.entity';
import { SaleLine } from '../domain/entities/sale-line.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the repository - using a partial mock for now to avoid interface issues
const mockSaleRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByUserId: jest.fn(),
  findByStoreId: jest.fn(),
  findByDateRange: jest.fn(),
  // Don't include findByUserIdWithRelations or findByUserIdWithRelationsRaw - they're optional
} as jest.Mocked<Partial<ISaleRepository>> as jest.Mocked<ISaleRepository>;

describe('SaleUseCases', () => {
  let saleUseCases: SaleUseCases;

  beforeEach(() => {
    saleUseCases = new SaleUseCases(mockSaleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSale', () => {
    it('should create a sale successfully', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: [
          { productId: 1, quantity: 2, unitPrice: 50.0 },
          { productId: 2, quantity: 1, unitPrice: 100.0 }
        ]
      };

      const createdSale = new Sale(
        1,
        new Date(),
        200.0,
        'active',
        1,
        1,
        [
          new SaleLine(1, 2, 50.0, 1, 0),
          new SaleLine(2, 1, 100.0, 1, 1)
        ]
      );

      mockSaleRepository.save.mockResolvedValue(createdSale);

      // Mock the stock update API call
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await saleUseCases.createSale(saleData);

      expect(result).toEqual({
        id: 1,
        date: expect.any(Date),
        total: 200.0,
        status: 'active',
        storeId: 1,
        userId: 1,
        lines: [
          { productId: 1, quantity: 2, unitPrice: 50.0, lineTotal: 100.0 },
          { productId: 2, quantity: 1, unitPrice: 100.0, lineTotal: 100.0 }
        ]
      });

      expect(mockSaleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 200.0,
          status: 'active',
          storeId: 1,
          userId: 1
        })
      );

      // Verify stock update calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should calculate total correctly', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: [
          { productId: 1, quantity: 3, unitPrice: 25.50 },
          { productId: 2, quantity: 2, unitPrice: 75.25 }
        ]
      };

      const expectedTotal = (3 * 25.50) + (2 * 75.25); // 76.50 + 150.50 = 227.00

      const createdSale = new Sale(1, new Date(), expectedTotal, 'active', 1, 1, []);
      mockSaleRepository.save.mockResolvedValue(createdSale);
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await saleUseCases.createSale(saleData);

      expect(result.total).toBe(227.0);
    });

    it('should handle empty sale lines', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: []
      };

      const createdSale = new Sale(1, new Date(), 0, 'active', 1, 1, []);
      mockSaleRepository.save.mockResolvedValue(createdSale);

      const result = await saleUseCases.createSale(saleData);

      expect(result.total).toBe(0);
      expect(result.lines).toEqual([]);
    });
  });

  describe('getSale', () => {
    it('should return sale when found', async () => {
      const sale = new Sale(
        1,
        new Date('2023-01-01'),
        150.0,
        'active',
        1,
        1,
        [new SaleLine(1, 3, 50.0, 1, 0)]
      );

      mockSaleRepository.findById.mockResolvedValue(sale);

      const result = await saleUseCases.getSale(1);

      expect(result).toEqual({
        id: 1,
        date: new Date('2023-01-01'),
        total: 150.0,
        status: 'active',
        storeId: 1,
        userId: 1,
        lines: [{ productId: 1, quantity: 3, unitPrice: 50.0, lineTotal: 150.0 }]
      });

      expect(mockSaleRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error when sale not found', async () => {
      mockSaleRepository.findById.mockResolvedValue(null);

      await expect(saleUseCases.getSale(999))
        .rejects.toThrow('Sale not found');
    });
  });

  describe('getAllSales', () => {
    it('should return all sales', async () => {
      const sales = [
        new Sale(1, new Date(), 100.0, 'active', 1, 1, []),
        new Sale(2, new Date(), 200.0, 'active', 1, 2, [])
      ];

      mockSaleRepository.findAll.mockResolvedValue(sales);

      const result = await saleUseCases.getAllSales();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(mockSaleRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no sales exist', async () => {
      mockSaleRepository.findAll.mockResolvedValue([]);

      const result = await saleUseCases.getAllSales();

      expect(result).toEqual([]);
    });
  });

  describe('getSalesByUser', () => {
    it('should return sales for specific user', async () => {
      const userSales = [
        new Sale(1, new Date(), 100.0, 'active', 1, 1, []),
        new Sale(3, new Date(), 300.0, 'active', 2, 1, [])
      ];

      // Since neither findByUserIdWithRelationsRaw nor findByUserIdWithRelations exist,
      // it should fall back to findByUserId
      mockSaleRepository.findByUserId.mockResolvedValue(userSales);

      const result = await saleUseCases.getSalesByUser(1);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(1);
      expect(result[1].userId).toBe(1);
      expect(mockSaleRepository.findByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('getSalesByStore', () => {
    it('should return sales for specific store', async () => {
      const storeSales = [
        new Sale(1, new Date(), 100.0, 'active', 1, 1, []),
        new Sale(2, new Date(), 200.0, 'active', 1, 2, [])
      ];

      mockSaleRepository.findByStoreId.mockResolvedValue(storeSales);

      const result = await saleUseCases.getSalesByStore(1);

      expect(result).toHaveLength(2);
      expect(result[0].storeId).toBe(1);
      expect(result[1].storeId).toBe(1);
      expect(mockSaleRepository.findByStoreId).toHaveBeenCalledWith(1);
    });
  });

  describe('updateSaleStatus', () => {
    it('should update sale status successfully', async () => {
      const existingSale = new Sale(1, new Date(), 100.0, 'active', 1, 1, []);
      const updatedSale = new Sale(1, new Date(), 100.0, 'refunded', 1, 1, []);

      mockSaleRepository.findById.mockResolvedValue(existingSale);
      mockSaleRepository.update.mockResolvedValue(updatedSale);

      const result = await saleUseCases.updateSaleStatus(1, 'refunded');

      expect(result.status).toBe('refunded');
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(1);
      expect(mockSaleRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'refunded'
      }));
    });

    it('should throw error when sale not found for status update', async () => {
      mockSaleRepository.findById.mockResolvedValue(null);

      await expect(saleUseCases.updateSaleStatus(999, 'refunded'))
        .rejects.toThrow('Sale not found');
    });
  });

  describe('stock management integration', () => {
    it('should handle stock update failure gracefully', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: [{ productId: 1, quantity: 2, unitPrice: 50.0 }]
      };

      mockSaleRepository.save.mockResolvedValue(
        new Sale(1, new Date(), 100.0, 'active', 1, 1, [])
      );

      // Mock stock update failure
      mockedAxios.post.mockRejectedValue(new Error('Stock service unavailable'));

      // The sale should still be created even if stock update fails
      const result = await saleUseCases.createSale(saleData);

      expect(result.id).toBe(1);
      expect(mockSaleRepository.save).toHaveBeenCalled();
    });
  });

  describe('business logic validation', () => {
    it('should handle negative quantities correctly', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: [{ productId: 1, quantity: -1, unitPrice: 50.0 }]
      };

      // Assuming the business logic should handle negative quantities
      const createdSale = new Sale(1, new Date(), -50.0, 'active', 1, 1, []);
      mockSaleRepository.save.mockResolvedValue(createdSale);
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await saleUseCases.createSale(saleData);

      expect(result.total).toBe(-50.0);
    });

    it('should handle zero price items', async () => {
      const saleData = {
        storeId: 1,
        userId: 1,
        lines: [{ productId: 1, quantity: 1, unitPrice: 0.0 }]
      };

      const createdSale = new Sale(1, new Date(), 0.0, 'active', 1, 1, []);
      mockSaleRepository.save.mockResolvedValue(createdSale);
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const result = await saleUseCases.createSale(saleData);

      expect(result.total).toBe(0.0);
    });
  });
});
