/**
 * Shared Sale Repository Implementation
 * 
 * Implements the ISaleRepository interface using the shared database infrastructure.
 * Includes cross-domain validation using shared cross-domain queries.
 * Provides proper transaction management for multi-step operations.
 */

import { Sale } from '../../domain/entities/sale.entity';
import { SaleLine } from '../../domain/entities/sale-line.entity';
import { ISaleRepository, SaleData } from '../../domain/repositories/sale.repository';
import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { ICrossDomainQueries } from '@shared/infrastructure/database/cross-domain-queries';
import { createLogger } from '@shared/infrastructure/logging';

// Define types for Prisma results
type PrismaSaleWithLines = {
  id: number;
  date: Date;
  total: number;
  status: string;
  storeId: number;
  userId: number;
  lines: {
    id: number;
    quantity: number;
    unitPrice: number;
    saleId: number;
    productId: number;
  }[];
};

const logger = createLogger('shared-sale-repository');

export class SharedSaleRepository extends BaseRepository<Sale, number> implements ISaleRepository {
  private readonly crossDomainQueries: ICrossDomainQueries;

  constructor(
    databaseManager: IDatabaseManager,
    crossDomainQueries: ICrossDomainQueries
  ) {
    super(databaseManager, 'sale');
    this.crossDomainQueries = crossDomainQueries;
  }

  // Override base repository methods to work with SaleData
  public async save(entity: SaleData): Promise<Sale> {
    try {
      logger.info('Creating new sale with validation', { 
        storeId: entity.storeId, 
        userId: entity.userId,
        total: entity.total 
      });

      const result = await this.executeInTransaction(async (tx) => {
        // Create the sale record
        const savedSale = await (tx as any).sale.create({
          data: {
            date: entity.date,
            total: entity.total,
            status: entity.status,
            storeId: entity.storeId,
            userId: entity.userId,
            lines: {
              create: entity.lines.map(line => ({
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: line.unitPrice
              }))
            }
          },
          include: {
            lines: true
          }
        });

        return this.mapToSaleEntity(savedSale);
      });

      logger.info('Created sale successfully', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Error creating sale', error as Error, { entity });
      throw error;
    }
  }

  public async update(id: number, entity: Partial<SaleData>): Promise<Sale> {
    try {
      logger.info('Updating sale', { id, entity });

      const updatedSale = await this.model.update({
        where: { id },
        data: {
          status: entity.status,
          total: entity.total,
          date: entity.date,
        },
        include: {
          lines: true
        }
      });

      const result = this.mapToSaleEntity(updatedSale);
      logger.info('Updated sale successfully', { id });
      return result;
    } catch (error) {
      logger.error('Error updating sale', error as Error, { id, entity });
      throw error;
    }
  }

  public async saveMany(entities: SaleData[]): Promise<Sale[]> {
    try {
      logger.info('Creating multiple sales', { count: entities.length });

      const results = await this.executeInTransaction(async (tx) => {
        const savedSales: Sale[] = [];
        for (const entity of entities) {
          const savedSale = await (tx as any).sale.create({
            data: {
              date: entity.date,
              total: entity.total,
              status: entity.status,
              storeId: entity.storeId,
              userId: entity.userId,
              lines: {
                create: entity.lines.map(line => ({
                  productId: line.productId,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice
                }))
              }
            },
            include: {
              lines: true
            }
          });
          savedSales.push(this.mapToSaleEntity(savedSale));
        }
        return savedSales;
      });

      logger.info('Created multiple sales successfully', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error creating multiple sales', error as Error, { count: entities.length });
      throw error;
    }
  }

  // Override findById to include proper mapping
  public async findById(id: number): Promise<Sale | null> {
    try {
      logger.info('Finding sale by ID', { id });

      const sale = await this.model.findUnique({
        where: { id },
        include: {
          lines: true
        }
      });

      if (!sale) {
        logger.info('Sale not found', { id });
        return null;
      }

      const result = this.mapToSaleEntity(sale);
      logger.info('Found sale', { id });
      return result;
    } catch (error) {
      logger.error('Error finding sale by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to include proper mapping
  public async findAll(): Promise<Sale[]> {
    try {
      logger.info('Finding all sales');

      const sales = await this.model.findMany({
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding all sales', error as Error);
      throw error;
    }
  }

  // Transaction-specific query methods
  public async findByUserId(userId: number): Promise<Sale[]> {
    try {
      logger.info('Finding sales by user ID', { userId });

      const sales = await this.model.findMany({
        where: { userId },
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by user ID', { userId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by user ID', error as Error, { userId });
      throw error;
    }
  }

  public async findByStoreId(storeId: number): Promise<Sale[]> {
    try {
      logger.info('Finding sales by store ID', { storeId });

      const sales = await this.model.findMany({
        where: { storeId },
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by store ID', { storeId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by store ID', error as Error, { storeId });
      throw error;
    }
  }

  public async findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      logger.info('Finding sales by date range', { startDate, endDate });

      const sales = await this.model.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by date range', { startDate, endDate, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by date range', error as Error, { startDate, endDate });
      throw error;
    }
  }

  public async findByUserIdWithRelations(userId: number): Promise<Sale[]> {
    try {
      logger.info('Finding sales by user ID with relations', { userId });

      const sales = await this.model.findMany({
        where: { userId },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          store: true,
          user: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by user ID with relations', { userId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by user ID with relations', error as Error, { userId });
      throw error;
    }
  }

  // New method to return raw data with relations for DTO mapping
  public async findByUserIdWithRelationsRaw(userId: number): Promise<any[]> {
    try {
      logger.info('Finding sales by user ID with relations raw', { userId });

      const sales = await this.model.findMany({
        where: { userId },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          store: true,
          user: true
        }
      });

      logger.info('Found sales by user ID with relations raw', { userId, count: sales.length });
      return sales;
    } catch (error) {
      logger.error('Error finding sales by user ID with relations raw', error as Error, { userId });
      throw error;
    }
  }

  public async findByStatus(status: string): Promise<Sale[]> {
    try {
      logger.info('Finding sales by status', { status });

      const sales = await this.model.findMany({
        where: { status },
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by status', { status, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by status', error as Error, { status });
      throw error;
    }
  }

  public async findByStoreAndDateRange(storeId: number, startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      logger.info('Finding sales by store and date range', { storeId, startDate, endDate });

      const sales = await this.model.findMany({
        where: {
          storeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          lines: true
        }
      });

      const results = sales.map((sale: PrismaSaleWithLines) => this.mapToSaleEntity(sale));
      logger.info('Found sales by store and date range', { storeId, startDate, endDate, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding sales by store and date range', error as Error, { storeId, startDate, endDate });
      throw error;
    }
  }

  // Cross-domain validation methods
  public async validateSaleData(sale: SaleData): Promise<{
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
    try {
      logger.info('Validating sale data', { 
        userId: sale.userId, 
        storeId: sale.storeId,
        lineCount: sale.lines.length 
      });

      const errors: string[] = [];
      const validatedData = {
        userExists: false,
        storeExists: false,
        productsExist: {} as { [productId: number]: boolean },
        stockAvailable: {} as { [productId: number]: boolean },
        pricesValid: {} as { [productId: number]: boolean },
      };

      // Validate user exists
      const userExists = await this.crossDomainQueries.validateUserExists(sale.userId, 'transaction-service');
      validatedData.userExists = userExists;
      if (!userExists) {
        errors.push(`User with ID ${sale.userId} does not exist`);
      }

      // Validate store exists
      const storeExists = await this.crossDomainQueries.validateStoreExists(sale.storeId, 'transaction-service');
      validatedData.storeExists = storeExists;
      if (!storeExists) {
        errors.push(`Store with ID ${sale.storeId} does not exist`);
      }

      // Validate products and stock for each line
      for (const line of sale.lines) {
        // Validate product exists
        const productExists = await this.crossDomainQueries.validateProductExists(line.productId, 'transaction-service');
        validatedData.productsExist[line.productId] = productExists;
        if (!productExists) {
          errors.push(`Product with ID ${line.productId} does not exist`);
          continue;
        }

        // Validate stock availability
        const stockAvailable = await this.crossDomainQueries.validateStockAvailability(
          sale.storeId, 
          line.productId, 
          line.quantity, 
          'transaction-service'
        );
        validatedData.stockAvailable[line.productId] = stockAvailable;
        if (!stockAvailable) {
          errors.push(`Insufficient stock for product ${line.productId} in store ${sale.storeId}`);
        }

        // Validate product price
        const priceValid = await this.crossDomainQueries.validateProductPrice(
          line.productId, 
          line.unitPrice, 
          'transaction-service'
        );
        validatedData.pricesValid[line.productId] = priceValid;
        if (!priceValid) {
          errors.push(`Invalid price for product ${line.productId}: expected different price than ${line.unitPrice}`);
        }
      }

      const isValid = errors.length === 0;
      logger.info('Sale data validation completed', { 
        isValid, 
        errorCount: errors.length,
        userId: sale.userId,
        storeId: sale.storeId 
      });

      return {
        isValid,
        errors,
        validatedData
      };
    } catch (error) {
      logger.error('Error validating sale data', error as Error, { sale });
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`]
      };
    }
  }

  public async createSaleWithValidation(sale: SaleData): Promise<Sale> {
    try {
      logger.info('Creating sale with validation', { 
        userId: sale.userId, 
        storeId: sale.storeId,
        total: sale.total 
      });

      // Validate sale data first
      const validation = await this.validateSaleData(sale);
      if (!validation.isValid) {
        const errorMessage = `Sale validation failed: ${validation.errors.join(', ')}`;
        logger.error('Sale validation failed', new Error(errorMessage), { sale });
        throw new Error(errorMessage);
      }

      // Create the sale if validation passes
      const result = await this.save(sale);
      logger.info('Created sale with validation successfully', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Error creating sale with validation', error as Error, { sale });
      throw error;
    }
  }

  public async updateSaleStatus(id: number, status: string): Promise<Sale> {
    try {
      logger.info('Updating sale status', { id, status });

      const result = await this.update(id, { status });
      logger.info('Updated sale status successfully', { id, status });
      return result;
    } catch (error) {
      logger.error('Error updating sale status', error as Error, { id, status });
      throw error;
    }
  }

  // Reporting and analytics methods
  public async getTotalSalesByStore(storeId: number, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      logger.info('Getting total sales by store', { storeId, startDate, endDate });

      const whereClause: any = { storeId };
      if (startDate && endDate) {
        whereClause.date = {
          gte: startDate,
          lte: endDate
        };
      }

      const result = await this.model.aggregate({
        where: whereClause,
        _sum: {
          total: true
        }
      });

      const total = result._sum.total || 0;
      logger.info('Got total sales by store', { storeId, total });
      return total;
    } catch (error) {
      logger.error('Error getting total sales by store', error as Error, { storeId, startDate, endDate });
      throw error;
    }
  }

  public async getTotalSalesByUser(userId: number, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      logger.info('Getting total sales by user', { userId, startDate, endDate });

      const whereClause: any = { userId };
      if (startDate && endDate) {
        whereClause.date = {
          gte: startDate,
          lte: endDate
        };
      }

      const result = await this.model.aggregate({
        where: whereClause,
        _sum: {
          total: true
        }
      });

      const total = result._sum.total || 0;
      logger.info('Got total sales by user', { userId, total });
      return total;
    } catch (error) {
      logger.error('Error getting total sales by user', error as Error, { userId, startDate, endDate });
      throw error;
    }
  }

  public async getSalesStatistics(filters?: {
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
    try {
      logger.info('Getting sales statistics', { filters });

      const whereClause: any = {};
      if (filters) {
        if (filters.storeId) whereClause.storeId = filters.storeId;
        if (filters.userId) whereClause.userId = filters.userId;
        if (filters.startDate && filters.endDate) {
          whereClause.date = {
            gte: filters.startDate,
            lte: filters.endDate
          };
        }
      }

      const [totalResult, salesByStatus] = await Promise.all([
        this.model.aggregate({
          where: whereClause,
          _count: { id: true },
          _sum: { total: true },
          _avg: { total: true }
        }),
        this.model.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true }
        })
      ]);

      const totalSales = totalResult._count.id || 0;
      const totalAmount = totalResult._sum.total || 0;
      const averageAmount = totalResult._avg.total || 0;

      const salesByStatusMap: { [status: string]: number } = {};
      salesByStatus.forEach((group: any) => {
        salesByStatusMap[group.status] = group._count.status;
      });

      const result = {
        totalSales,
        totalAmount,
        averageAmount,
        salesByStatus: salesByStatusMap
      };

      logger.info('Got sales statistics', { result });
      return result;
    } catch (error) {
      logger.error('Error getting sales statistics', error as Error, { filters });
      throw error;
    }
  }

  // Helper method to map database result to Sale entity
  private mapToSaleEntity(saleData: PrismaSaleWithLines): Sale {
    const saleLines = saleData.lines.map((line: {
      id: number;
      quantity: number;
      unitPrice: number;
      saleId: number;
      productId: number;
    }) => 
      new SaleLine(line.productId, line.quantity, line.unitPrice, line.saleId, line.id)
    );

    return new Sale(
      saleData.id,
      saleData.date,
      saleData.total,
      saleData.status,
      saleData.storeId,
      saleData.userId,
      saleLines
    );
  }
}