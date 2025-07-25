/**
 * Shared Refund Repository Implementation
 * 
 * Implements the IRefundRepository interface using the shared database infrastructure.
 * Includes cross-domain validation using shared cross-domain queries.
 * Provides proper transaction management for multi-step operations.
 * 
 */

import { Refund } from '../../domain/entities/refund.entity';
import { RefundLine } from '../../domain/entities/refund-line.entity';
import { IRefundRepository, RefundData } from '../../domain/repositories/refund.repository';
import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { ICrossDomainQueries } from '@shared/infrastructure/database/cross-domain-queries';
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('shared-refund-repository');

export class SharedRefundRepository extends BaseRepository<Refund, number> implements IRefundRepository {
  private readonly crossDomainQueries: ICrossDomainQueries;

  constructor(
    databaseManager: IDatabaseManager,
    crossDomainQueries: ICrossDomainQueries
  ) {
    super(databaseManager, 'refund');
    this.crossDomainQueries = crossDomainQueries;
  }

  // Override base repository methods to work with RefundData
  public async save(entity: RefundData): Promise<Refund> {
    try {
      logger.info('Creating new refund with validation', { 
        saleId: entity.saleId,
        storeId: entity.storeId, 
        userId: entity.userId,
        total: entity.total 
      });

      const result = await this.executeInTransaction(async (tx) => {
        // Create the refund record
        const savedRefund = await (tx as any).refund.create({
          data: {
            date: entity.date,
            total: entity.total,
            reason: entity.reason,
            saleId: entity.saleId,
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

        return this.mapToRefundEntity(savedRefund);
      });

      logger.info('Created refund successfully', { id: result.id });
      return result;
    } catch (error) {
      logger.error('Error creating refund', error as Error, { entity });
      throw error;
    }
  }

  public async update(id: number, entity: Partial<RefundData>): Promise<Refund> {
    try {
      logger.info('Updating refund', { id, entity });

      const updatedRefund = await this.model.update({
        where: { id },
        data: {
          reason: entity.reason,
          total: entity.total,
          date: entity.date,
        },
        include: {
          lines: true
        }
      });

      const result = this.mapToRefundEntity(updatedRefund);
      logger.info('Updated refund successfully', { id });
      return result;
    } catch (error) {
      logger.error('Error updating refund', error as Error, { id, entity });
      throw error;
    }
  }

  public async saveMany(entities: RefundData[]): Promise<Refund[]> {
    try {
      logger.info('Creating multiple refunds', { count: entities.length });

      const results = await this.executeInTransaction(async (tx) => {
        const savedRefunds: Refund[] = [];
        for (const entity of entities) {
          const savedRefund = await (tx as any).refund.create({
            data: {
              date: entity.date,
              total: entity.total,
              reason: entity.reason,
              saleId: entity.saleId,
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
          savedRefunds.push(this.mapToRefundEntity(savedRefund));
        }
        return savedRefunds;
      });

      logger.info('Created multiple refunds successfully', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error creating multiple refunds', error as Error, { count: entities.length });
      throw error;
    }
  }

  // Override findById to include proper mapping
  public async findById(id: number): Promise<Refund | null> {
    try {
      logger.info('Finding refund by ID', { id });

      const refund = await this.model.findUnique({
        where: { id },
        include: {
          lines: true
        }
      });

      if (!refund) {
        logger.info('Refund not found', { id });
        return null;
      }

      const result = this.mapToRefundEntity(refund);
      logger.info('Found refund', { id });
      return result;
    } catch (error) {
      logger.error('Error finding refund by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to include proper mapping
  public async findAll(): Promise<Refund[]> {
    try {
      logger.info('Finding all refunds');

      const refunds = await this.model.findMany({
        include: {
          lines: true
        }
      });

      const results = refunds.map((refund: any) => this.mapToRefundEntity(refund));
      logger.info('Found refunds', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding all refunds', error as Error);
      throw error;
    }
  }

  // Refund-specific query methods
  public async findByUserId(userId: number): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by user ID', { userId });

      const refunds = await this.model.findMany({
        where: { userId },
        include: {
          lines: true
        }
      });

      const results = refunds.map((refund: any) => this.mapToRefundEntity(refund));
      logger.info('Found refunds by user ID', { userId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding refunds by user ID', error as Error, { userId });
      throw error;
    }
  }

  public async findByStoreId(storeId: number): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by store ID', { storeId });

      const refunds = await this.model.findMany({
        where: { storeId },
        include: {
          lines: true
        }
      });

      const results = refunds.map((refund: any) => this.mapToRefundEntity(refund));
      logger.info('Found refunds by store ID', { storeId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding refunds by store ID', error as Error, { storeId });
      throw error;
    }
  }

  public async findBySaleId(saleId: number): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by sale ID', { saleId });

      const refunds = await this.model.findMany({
        where: { saleId },
        include: {
          lines: true
        }
      });

      const results = refunds.map((refund: any) => this.mapToRefundEntity(refund));
      logger.info('Found refunds by sale ID', { saleId, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding refunds by sale ID', error as Error, { saleId });
      throw error;
    }
  }

  public async findByDateRange(startDate: Date, endDate: Date): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by date range', { startDate, endDate });

      const refunds = await this.model.findMany({
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

      const results = refunds.map((refund: any) => this.mapToRefundEntity(refund));
      logger.info('Found refunds by date range', { startDate, endDate, count: results.length });
      return results;
    } catch (error) {
      logger.error('Error finding refunds by date range', error as Error, { startDate, endDate });
      throw error;
    }
  }

  // Missing base repository methods
  public async delete(id: number): Promise<void> {
    try {
      logger.info('Deleting refund', { id });
      await this.model.delete({ where: { id } });
      logger.info('Deleted refund successfully', { id });
    } catch (error) {
      logger.error('Error deleting refund', error as Error, { id });
      throw error;
    }
  }

  public async exists(id: number): Promise<boolean> {
    try {
      const refund = await this.model.findUnique({ where: { id } });
      return refund !== null;
    } catch (error) {
      logger.error('Error checking refund existence', error as Error, { id });
      throw error;
    }
  }

  public async count(): Promise<number> {
    try {
      return await this.model.count();
    } catch (error) {
      logger.error('Error counting refunds', error as Error);
      throw error;
    }
  }

  public async deleteMany(ids: number[]): Promise<void> {
    try {
      logger.info('Deleting multiple refunds', { ids });
      await this.model.deleteMany({
        where: { id: { in: ids } }
      });
      logger.info('Deleted multiple refunds successfully', { count: ids.length });
    } catch (error) {
      logger.error('Error deleting multiple refunds', error as Error, { ids });
      throw error;
    }
  }

  public async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: Refund[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const [refunds, total] = await Promise.all([
        this.model.findMany({
          skip,
          take: limit,
          where,
          orderBy,
          include: { lines: true }
        }),
        this.model.count({ where })
      ]);

      return {
        data: refunds.map((refund: any) => this.mapToRefundEntity(refund)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error finding refunds with pagination', error as Error, { page, limit });
      throw error;
    }
  }

  // Additional refund-specific methods
  public async findByUserIdWithRelations(userId: number): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by user ID with relations', { userId });
      const refunds = await this.model.findMany({
        where: { userId },
        include: {
          lines: {
            include: {
              product: true
            }
          }
        }
      });
      return refunds.map((refund: any) => this.mapToRefundEntity(refund));
    } catch (error) {
      logger.error('Error finding refunds by user ID with relations', error as Error, { userId });
      throw error;
    }
  }

  // New method to return raw data with relations for DTO mapping
  public async findByUserIdWithRelationsRaw(userId: number): Promise<any[]> {
    try {
      logger.info('Finding refunds by user ID with relations raw', { userId });
      const refunds = await this.model.findMany({
        where: { userId },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          store: true,
          user: true,
          sale: true
        }
      });
      logger.info('Found refunds by user ID with relations raw', { userId, count: refunds.length });
      return refunds;
    } catch (error) {
      logger.error('Error finding refunds by user ID with relations raw', error as Error, { userId });
      throw error;
    }
  }

  // Method to get all refunds with relations for admin view
  public async findAllWithRelationsRaw(): Promise<any[]> {
    try {
      logger.info('Finding all refunds with relations raw');
      const refunds = await this.model.findMany({
        include: {
          lines: {
            include: {
              product: true
            }
          },
          store: true,
          user: true,
          sale: true
        }
      });
      logger.info('Found all refunds with relations raw', { count: refunds.length });
      return refunds;
    } catch (error) {
      logger.error('Error finding all refunds with relations raw', error as Error);
      throw error;
    }
  }

  public async findByReason(reason: string): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by reason', { reason });
      const refunds = await this.model.findMany({
        where: { reason },
        include: { lines: true }
      });
      return refunds.map((refund: any) => this.mapToRefundEntity(refund));
    } catch (error) {
      logger.error('Error finding refunds by reason', error as Error, { reason });
      throw error;
    }
  }

  public async findByStoreAndDateRange(storeId: number, startDate: Date, endDate: Date): Promise<Refund[]> {
    try {
      logger.info('Finding refunds by store and date range', { storeId, startDate, endDate });
      const refunds = await this.model.findMany({
        where: {
          storeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { lines: true }
      });
      return refunds.map((refund: any) => this.mapToRefundEntity(refund));
    } catch (error) {
      logger.error('Error finding refunds by store and date range', error as Error, { storeId, startDate, endDate });
      throw error;
    }
  }

  // Cross-domain validation methods
  public async validateRefundData(refund: RefundData): Promise<{
    isValid: boolean;
    errors: string[];
    validatedData?: {
      userExists: boolean;
      storeExists: boolean;
      saleExists: boolean;
      saleIsRefundable: boolean;
      productsExist: { [productId: number]: boolean };
      refundQuantitiesValid: { [productId: number]: boolean };
      pricesValid: { [productId: number]: boolean };
    };
  }> {
    try {
      // Use cross-domain queries for validation
      const userExists = await this.crossDomainQueries.validateUserExists(refund.userId, 'transaction-service');
      const storeExists = await this.crossDomainQueries.validateStoreExists(refund.storeId, 'transaction-service');
      // Note: Sale validation would need to be implemented in cross-domain queries
      const saleExists = true; // Simplified for now
      
      const errors: string[] = [];
      if (!userExists) errors.push(`User ${refund.userId} does not exist`);
      if (!storeExists) errors.push(`Store ${refund.storeId} does not exist`);

      // Validate products and quantities
      const productsExist: { [productId: number]: boolean } = {};
      const refundQuantitiesValid: { [productId: number]: boolean } = {};
      const pricesValid: { [productId: number]: boolean } = {};

      for (const line of refund.lines) {
        const productExists = await this.crossDomainQueries.validateProductExists(line.productId, 'transaction-service');
        productsExist[line.productId] = productExists;
        
        if (!productExists) {
          errors.push(`Product ${line.productId} does not exist`);
        }
        
        // Validate quantities and prices would need additional cross-domain queries
        refundQuantitiesValid[line.productId] = line.quantity > 0;
        pricesValid[line.productId] = line.unitPrice > 0;
      }

      return {
        isValid: errors.length === 0,
        errors,
        validatedData: {
          userExists,
          storeExists,
          saleExists,
          saleIsRefundable: saleExists, // Simplified for now
          productsExist,
          refundQuantitiesValid,
          pricesValid
        }
      };
    } catch (error) {
      logger.error('Error validating refund data', error as Error, { refund });
      throw error;
    }
  }

  public async createRefundWithValidation(refund: RefundData): Promise<Refund> {
    try {
      const validation = await this.validateRefundData(refund);
      if (!validation.isValid) {
        throw new Error(`Refund validation failed: ${validation.errors.join(', ')}`);
      }
      return await this.save(refund);
    } catch (error) {
      logger.error('Error creating refund with validation', error as Error, { refund });
      throw error;
    }
  }

  public async validateRefundEligibility(saleId: number, refundLines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>): Promise<{
    isEligible: boolean;
    errors: string[];
    maxRefundableQuantities?: { [productId: number]: number };
  }> {
    try {
      const errors: string[] = [];
      const maxRefundableQuantities: { [productId: number]: number } = {};

      // Check if sale exists - simplified for now
      const saleExists = true; // Would need cross-domain sale validation
      if (!saleExists) {
        errors.push(`Sale ${saleId} does not exist`);
      }

      // For each product, check refund eligibility
      for (const line of refundLines) {
        const productExists = await this.crossDomainQueries.validateProductExists(line.productId, 'transaction-service');
        if (!productExists) {
          errors.push(`Product ${line.productId} does not exist`);
        }
        
        // This would require additional cross-domain queries to check sale lines
        maxRefundableQuantities[line.productId] = line.quantity; // Simplified
      }

      return {
        isEligible: errors.length === 0,
        errors,
        maxRefundableQuantities
      };
    } catch (error) {
      logger.error('Error validating refund eligibility', error as Error, { saleId, refundLines });
      throw error;
    }
  }

  // Reporting and analytics methods
  public async getTotalRefundsByStore(storeId: number, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const where: any = { storeId };
      if (startDate && endDate) {
        where.date = { gte: startDate, lte: endDate };
      }
      
      const result = await this.model.aggregate({
        where,
        _sum: { total: true }
      });
      
      return result._sum.total || 0;
    } catch (error) {
      logger.error('Error getting total refunds by store', error as Error, { storeId, startDate, endDate });
      throw error;
    }
  }

  public async getTotalRefundsByUser(userId: number, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const where: any = { userId };
      if (startDate && endDate) {
        where.date = { gte: startDate, lte: endDate };
      }
      
      const result = await this.model.aggregate({
        where,
        _sum: { total: true }
      });
      
      return result._sum.total || 0;
    } catch (error) {
      logger.error('Error getting total refunds by user', error as Error, { userId, startDate, endDate });
      throw error;
    }
  }

  public async getTotalRefundsBySale(saleId: number): Promise<number> {
    try {
      const result = await this.model.aggregate({
        where: { saleId },
        _sum: { total: true }
      });
      
      return result._sum.total || 0;
    } catch (error) {
      logger.error('Error getting total refunds by sale', error as Error, { saleId });
      throw error;
    }
  }

  public async getRefundStatistics(filters?: {
    storeId?: number;
    userId?: number;
    saleId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRefunds: number;
    totalAmount: number;
    averageAmount: number;
    refundsByReason: { [reason: string]: number };
  }> {
    try {
      const where: any = {};
      if (filters) {
        if (filters.storeId) where.storeId = filters.storeId;
        if (filters.userId) where.userId = filters.userId;
        if (filters.saleId) where.saleId = filters.saleId;
        if (filters.startDate && filters.endDate) {
          where.date = { gte: filters.startDate, lte: filters.endDate };
        }
      }

      const [totalRefunds, totalAmount, refundsByReason] = await Promise.all([
        this.model.count({ where }),
        this.model.aggregate({ where, _sum: { total: true } }),
        this.model.groupBy({
          by: ['reason'],
          where,
          _count: { reason: true }
        })
      ]);

      const refundsByReasonMap: { [reason: string]: number } = {};
      refundsByReason.forEach((item: any) => {
        refundsByReasonMap[item.reason || 'No reason'] = item._count.reason;
      });

      return {
        totalRefunds,
        totalAmount: totalAmount._sum.total || 0,
        averageAmount: totalRefunds > 0 ? (totalAmount._sum.total || 0) / totalRefunds : 0,
        refundsByReason: refundsByReasonMap
      };
    } catch (error) {
      logger.error('Error getting refund statistics', error as Error, { filters });
      throw error;
    }
  }

  // Helper method to map database result to Refund entity
  private mapToRefundEntity(refundData: any): Refund {
    const refundLines = refundData.lines.map((line: any) => 
      new RefundLine(line.productId, line.quantity, line.unitPrice, line.refundId, line.id)
    );

    return new Refund(
      refundData.id,
      refundData.date,
      refundData.total,
      refundData.saleId,
      refundData.storeId,
      refundData.userId,
      refundLines,
      refundData.reason || undefined
    );
  }
}
