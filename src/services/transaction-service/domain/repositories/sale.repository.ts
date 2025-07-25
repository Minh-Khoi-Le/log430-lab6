import { Sale } from '../entities/sale.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { IBaseRepository } from '@shared/infrastructure/database/base-repository';

/**
 * Data types for Sale repository operations
 */
export interface SaleData {
  date: Date;
  total: number;
  status: string;
  storeId: number;
  userId: number;
  lines: SaleLine[];
}

/**
 * Sale Repository Interface
 * 
 * Defines the contract for sale data access operations within the transaction domain.
 * Includes base repository methods and transaction-specific query methods.
 * Includes cross-domain validation requirements for sales processing.
 * 
 * Requirements: 3.1, 5.1, 5.2
 */
export interface ISaleRepository {
  // Base repository methods
  findById(id: number): Promise<Sale | null>;
  findAll(): Promise<Sale[]>;
  save(entity: SaleData): Promise<Sale>;
  update(id: number, entity: Partial<SaleData>): Promise<Sale>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  count(): Promise<number>;
  saveMany(entities: SaleData[]): Promise<Sale[]>;
  deleteMany(ids: number[]): Promise<void>;
  findWithPagination(
    page?: number,
    limit?: number,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: Sale[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  // Transaction-specific query methods
  findByUserId(userId: number): Promise<Sale[]>;
  findByStoreId(storeId: number): Promise<Sale[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
  findByUserIdWithRelations(userId: number): Promise<Sale[]>;
  findByUserIdWithRelationsRaw?(userId: number): Promise<any[]>;
  findByStatus(status: string): Promise<Sale[]>;
  findByStoreAndDateRange(storeId: number, startDate: Date, endDate: Date): Promise<Sale[]>;
  
  // Cross-domain validation methods
  validateSaleData(sale: SaleData): Promise<{
    isValid: boolean;
    errors: string[];
    validatedData?: {
      userExists: boolean;
      storeExists: boolean;
      productsExist: { [productId: number]: boolean };
      stockAvailable: { [productId: number]: boolean };
      pricesValid: { [productId: number]: boolean };
    };
  }>;
  
  // Transaction management methods
  createSaleWithValidation(sale: SaleData): Promise<Sale>;
  updateSaleStatus(id: number, status: string): Promise<Sale>;
  
  // Reporting and analytics methods
  getTotalSalesByStore(storeId: number, startDate?: Date, endDate?: Date): Promise<number>;
  getTotalSalesByUser(userId: number, startDate?: Date, endDate?: Date): Promise<number>;
  getSalesStatistics(filters?: {
    storeId?: number;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalSales: number;
    totalAmount: number;
    averageAmount: number;
    salesByStatus: { [status: string]: number };
  }>;
}


