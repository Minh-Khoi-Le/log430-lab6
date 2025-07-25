import { Refund } from '../entities/refund.entity';
import { RefundLine } from '../entities/refund-line.entity';
import { IBaseRepository } from '@shared/infrastructure/database/base-repository';

/**
 * Data types for Refund repository operations
 */
export interface RefundData {
  date: Date;
  total: number;
  saleId: number;
  storeId: number;
  userId: number;
  lines: RefundLine[];
  reason?: string;
}

/**
 * Refund Repository Interface
 * 
 * Defines the contract for refund data access operations within the transaction domain.
 * Includes base repository methods and refund-specific query methods.
 * Includes cross-domain validation requirements for refund processing.
 * 
 * Requirements: 3.1, 5.1, 5.2
 */
export interface IRefundRepository {
  // Base repository methods
  findById(id: number): Promise<Refund | null>;
  findAll(): Promise<Refund[]>;
  save(entity: RefundData): Promise<Refund>;
  update(id: number, entity: Partial<RefundData>): Promise<Refund>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  count(): Promise<number>;
  saveMany(entities: RefundData[]): Promise<Refund[]>;
  deleteMany(ids: number[]): Promise<void>;
  findWithPagination(
    page?: number,
    limit?: number,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: Refund[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  // Refund-specific query methods
  findByUserId(userId: number): Promise<Refund[]>;
  findByStoreId(storeId: number): Promise<Refund[]>;
  findBySaleId(saleId: number): Promise<Refund[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Refund[]>;
  findByUserIdWithRelations(userId: number): Promise<Refund[]>;
  findByUserIdWithRelationsRaw?(userId: number): Promise<any[]>;
  findAllWithRelationsRaw?(): Promise<any[]>;
  findByReason(reason: string): Promise<Refund[]>;
  findByStoreAndDateRange(storeId: number, startDate: Date, endDate: Date): Promise<Refund[]>;
  
  // Cross-domain validation methods
  validateRefundData(refund: RefundData): Promise<{
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
  }>;
  
  // Transaction management methods
  createRefundWithValidation(refund: RefundData): Promise<Refund>;
  validateRefundEligibility(saleId: number, refundLines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>): Promise<{
    isEligible: boolean;
    errors: string[];
    maxRefundableQuantities?: { [productId: number]: number };
  }>;
  
  // Reporting and analytics methods
  getTotalRefundsByStore(storeId: number, startDate?: Date, endDate?: Date): Promise<number>;
  getTotalRefundsByUser(userId: number, startDate?: Date, endDate?: Date): Promise<number>;
  getTotalRefundsBySale(saleId: number): Promise<number>;
  getRefundStatistics(filters?: {
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
  }>;
}


