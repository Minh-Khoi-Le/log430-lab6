/**
 * Unit Tests for Sale Repository Interface
 * 
 * Tests the contract and behavior expectations for ISaleRepository implementations.
 * These tests validate that any implementation of ISaleRepository follows the expected interface.
 * 
 * Requirements: 3.1, 5.1, 5.2
 */

import { Sale } from '../domain/entities/sale.entity';
import { SaleLine } from '../domain/entities/sale-line.entity';
import { ISaleRepository, SaleData } from '../domain/repositories/sale.repository';

// Mock implementation for testing interface contracts
class MockSaleRepository implements ISaleRepository {
  private sales: Sale[] = [];
  private nextId = 1;

  // Base repository methods
  async findById(id: number): Promise<Sale | null> {
    return this.sales.find(sale => sale.id === id) || null;
  }

  async findAll(): Promise<Sale[]> {
    return [...this.sales];
  }

  async save(entity: SaleData): Promise<Sale> {
    const sale = new Sale(
      this.nextId++,
      entity.date,
      entity.total,
      entity.status,
      entity.storeId,
      entity.userId,
      entity.lines
    );
    this.sales.push(sale);
    return sale;
  }

  async update(id: number, entity: Partial<SaleData>): Promise<Sale> {
    const index = this.sales.findIndex(sale => sale.id === id);
    if (index === -1) {
      throw new Error('Sale not found');
    }
    
    const existingSale = this.sales[index];
    const updatedSale = new Sale(
      existingSale.id,
      entity.date || existingSale.date,
      entity.total || existingSale.total,
      entity.status || existingSale.status,
      entity.storeId || existingSale.storeId,
      entity.userId || existingSale.userId,
      entity.lines || existingSale.lines
    );
    
    this.sales[index] = updatedSale;
    return updatedSale;
  }

  async delete(id: number): Promise<void> {
    const index = this.sales.findIndex(sale => sale.id === id);
    if (index !== -1) {
      this.sales.splice(index, 1);
    }
  }

  async exists(id: number): Promise<boolean> {
    return this.sales.some(sale => sale.id === id);
  }

  async count(): Promise<number> {
    return this.sales.length;
  }

  async saveMany(entities: SaleData[]): Promise<Sale[]> {
    const savedSales: Sale[] = [];
    for (const entity of entities) {
      const saved = await this.save(entity);
      savedSales.push(saved);
    }
    return savedSales;
  }

  async deleteMany(ids: number[]): Promise<void> {
    this.sales = this.sales.filter(sale => !ids.includes(sale.id));
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: Sale[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const total = this.sales.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = this.sales.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // Transaction-specific methods
  async findByUserId(userId: number): Promise<Sale[]> {
    return this.sales.filter(sale => sale.userId === userId);
  }

  async findByStoreId(storeId: number): Promise<Sale[]> {
    return this.sales.filter(sale => sale.storeId === storeId);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return this.sales.filter(sale => 
      sale.date >= startDate && sale.date <= endDate
    );
  }

  async findByUserIdWithRelations(userId: number): Promise<Sale[]> {
    return this.findByUserId(userId);
  }

  async findByStatus(status: string): Promise<Sale[]> {
    return this.sales.filter(sale => sale.status === status);
  }

  async findByStoreAndDateRange(storeId: number, startDate: Date, endDate: Date): Promise<Sale[]> {
    return this.sales.filter(sale => 
      sale.storeId === storeId && 
      sale.date >= startDate && 
      sale.date <= endDate
    );
  }

  // Cross-domain validation methods (mock implementations)
  async validateSaleData(sale: SaleData): Promise<{
    isValid: boolean;
    errors: string[];
    validatedData?: {
      userExists: boolean;
      storeExists: boolean;
      productsExist: { [productId: number]: boolean };
      stockAvailable: { [productId: number]: boolean };
      pricesValid: { [productId: number]: boolean };
    };
  }> {
    return {
      isValid: true,
      errors: [],
      validatedData: {
        userExists: true,
        storeExists: true,
        productsExist: {},
        stockAvailable: {},
        pricesValid: {},
      },
    };
  }

  async createSaleWithValidation(sale: SaleData): Promise<Sale> {
    const validation = await this.validateSaleData(sale);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    return this.save(sale);
  }

  async updateSaleStatus(id: number, status: string): Promise<Sale> {
    return this.update(id, { status });
  }

  async getTotalSalesByStore(storeId: number, startDate?: Date, endDate?: Date): Promise<number> {
    let storeSales = this.sales.filter(sale => sale.storeId === storeId);
    
    if (startDate && endDate) {
      storeSales = storeSales.filter(sale => 
        sale.date >= startDate && sale.date <= endDate
      );
    }
    
    return storeSales.reduce((total, sale) => total + sale.total, 0);
  }

  async getTotalSalesByUser(userId: number, startDate?: Date, endDate?: Date): Promise<number> {
    let userSales = this.sales.filter(sale => sale.userId === userId);
    
    if (startDate && endDate) {
      userSales = userSales.filter(sale => 
        sale.date >= startDate && sale.date <= endDate
      );
    }
    
    return userSales.reduce((total, sale) => total + sale.total, 0);
  }

  async getSalesStatistics(filters?: {
    storeId?: number;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalSales: number;
    totalAmount: number;
    averageAmount: number;
    salesByStatus: { [status: string]: number };
  }> {
    let filteredSales = [...this.sales];

    if (filters) {
      if (filters.storeId) {
        filteredSales = filteredSales.filter(sale => sale.storeId === filters.storeId);
      }
      if (filters.userId) {
        filteredSales = filteredSales.filter(sale => sale.userId === filters.userId);
      }
      if (filters.startDate && filters.endDate) {
        filteredSales = filteredSales.filter(sale => 
          sale.date >= filters.startDate! && sale.date <= filters.endDate!
        );
      }
    }

    const totalSales = filteredSales.length;
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0;

    const salesByStatus: { [status: string]: number } = {};
    filteredSales.forEach(sale => {
      salesByStatus[sale.status] = (salesByStatus[sale.status] || 0) + 1;
    });

    return {
      totalSales,
      totalAmount,
      averageAmount,
      salesByStatus,
    };
  }
}

describe('ISaleRepository Interface Contract', () => {
  let repository: ISaleRepository;
  let sampleSale: SaleData;
  let sampleSaleLines: SaleLine[];

  beforeEach(() => {
    repository = new MockSaleRepository();
    
    sampleSaleLines = [
      new SaleLine(1, 2, 10.50, 1, 1),
      new SaleLine(2, 1, 25.00, 1, 2),
    ];
    
    sampleSale = {
      date: new Date('2024-01-15'),
      total: 46.00,
      status: 'completed',
      storeId: 1,
      userId: 1,
      lines: sampleSaleLines,
    };
  });

  describe('Base Repository Methods', () => {
    test('should save and retrieve a sale', async () => {
      const savedSale = await repository.save(sampleSale);
      
      expect(savedSale.id).toBeDefined();
      expect(savedSale.total).toBe(46.00);
      expect(savedSale.storeId).toBe(1);
      expect(savedSale.userId).toBe(1);
      
      const retrievedSale = await repository.findById(savedSale.id);
      expect(retrievedSale).toEqual(savedSale);
    });

    test('should return null for non-existent sale', async () => {
      const result = await repository.findById(999);
      expect(result).toBeNull();
    });

    test('should update sale status', async () => {
      const savedSale = await repository.save(sampleSale);
      const updatedSale = await repository.update(savedSale.id, { status: 'refunded' });
      
      expect(updatedSale.status).toBe('refunded');
      expect(updatedSale.id).toBe(savedSale.id);
    });

    test('should delete a sale', async () => {
      const savedSale = await repository.save(sampleSale);
      await repository.delete(savedSale.id);
      
      const retrievedSale = await repository.findById(savedSale.id);
      expect(retrievedSale).toBeNull();
    });

    test('should check if sale exists', async () => {
      const savedSale = await repository.save(sampleSale);
      
      const exists = await repository.exists(savedSale.id);
      expect(exists).toBe(true);
      
      const notExists = await repository.exists(999);
      expect(notExists).toBe(false);
    });

    test('should count sales', async () => {
      await repository.save(sampleSale);
      await repository.save({ ...sampleSale, userId: 2 });
      
      const count = await repository.count();
      expect(count).toBe(2);
    });
  });

  describe('Transaction-Specific Query Methods', () => {
    beforeEach(async () => {
      // Create test data
      await repository.save(sampleSale);
      await repository.save({ ...sampleSale, userId: 2, storeId: 2 });
      await repository.save({ ...sampleSale, date: new Date('2024-02-15') });
    });

    test('should find sales by user ID', async () => {
      const userSales = await repository.findByUserId(1);
      expect(userSales).toHaveLength(2);
      expect(userSales.every(sale => sale.userId === 1)).toBe(true);
    });

    test('should find sales by store ID', async () => {
      const storeSales = await repository.findByStoreId(1);
      expect(storeSales).toHaveLength(2);
      expect(storeSales.every(sale => sale.storeId === 1)).toBe(true);
    });

    test('should find sales by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const salesInRange = await repository.findByDateRange(startDate, endDate);
      expect(salesInRange).toHaveLength(2);
      expect(salesInRange.every(sale => 
        sale.date >= startDate && sale.date <= endDate
      )).toBe(true);
    });

    test('should find sales by status', async () => {
      await repository.save({ ...sampleSale, status: 'pending' });
      
      const completedSales = await repository.findByStatus('completed');
      expect(completedSales).toHaveLength(3);
      
      const pendingSales = await repository.findByStatus('pending');
      expect(pendingSales).toHaveLength(1);
    });
  });

  describe('Cross-Domain Validation Methods', () => {
    test('should validate sale data', async () => {
      const validation = await repository.validateSaleData(sampleSale);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
      
      if (validation.validatedData) {
        expect(validation.validatedData).toHaveProperty('userExists');
        expect(validation.validatedData).toHaveProperty('storeExists');
        expect(validation.validatedData).toHaveProperty('productsExist');
        expect(validation.validatedData).toHaveProperty('stockAvailable');
        expect(validation.validatedData).toHaveProperty('pricesValid');
      }
    });

    test('should create sale with validation', async () => {
      const sale = await repository.createSaleWithValidation(sampleSale);
      
      expect(sale.id).toBeDefined();
      expect(sale.total).toBe(sampleSale.total);
      expect(sale.userId).toBe(sampleSale.userId);
      expect(sale.storeId).toBe(sampleSale.storeId);
    });
  });

  describe('Reporting and Analytics Methods', () => {
    beforeEach(async () => {
      // Create test data for analytics
      await repository.save({ ...sampleSale, total: 100, storeId: 1 });
      await repository.save({ ...sampleSale, total: 200, storeId: 1 });
      await repository.save({ ...sampleSale, total: 150, storeId: 2 });
    });

    test('should get total sales by store', async () => {
      const store1Total = await repository.getTotalSalesByStore(1);
      expect(store1Total).toBe(300);
      
      const store2Total = await repository.getTotalSalesByStore(2);
      expect(store2Total).toBe(150);
    });

    test('should get total sales by user', async () => {
      const userTotal = await repository.getTotalSalesByUser(1);
      expect(userTotal).toBe(450);
    });

    test('should get sales statistics', async () => {
      const stats = await repository.getSalesStatistics();
      
      expect(stats.totalSales).toBe(3);
      expect(stats.totalAmount).toBe(450);
      expect(stats.averageAmount).toBe(150);
      expect(stats.salesByStatus).toHaveProperty('completed');
    });

    test('should get filtered sales statistics', async () => {
      const stats = await repository.getSalesStatistics({ storeId: 1 });
      
      expect(stats.totalSales).toBe(2);
      expect(stats.totalAmount).toBe(300);
      expect(stats.averageAmount).toBe(150);
    });
  });

  describe('Pagination Support', () => {
    beforeEach(async () => {
      // Create multiple sales for pagination testing
      for (let i = 0; i < 15; i++) {
        await repository.save({ ...sampleSale, userId: i + 1 });
      }
    });

    test('should support pagination', async () => {
      const page1 = await repository.findWithPagination(1, 5);
      
      expect(page1.data).toHaveLength(5);
      expect(page1.total).toBe(15);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(5);
      expect(page1.totalPages).toBe(3);
      
      const page2 = await repository.findWithPagination(2, 5);
      expect(page2.data).toHaveLength(5);
      expect(page2.page).toBe(2);
    });
  });
});