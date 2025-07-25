import { IRefundRepository, RefundData } from '../../domain/repositories/refund.repository';
import { ISaleRepository } from '../../domain/repositories/sale.repository';
import { CreateRefundDTO, RefundResponseDTO, RefundsSummaryDTO } from '../dtos/refund.dto';
import { Refund } from '../../domain/entities/refund.entity';
import { RefundLine } from '../../domain/entities/refund-line.entity';
import { ICatalogService } from '../../infrastructure/services/catalog.service';

/**
 * Use case class for managing refund operations (CRUD and business logic).
 * Handles the creation, retrieval, and processing of refund transactions.
 */
export class RefundUseCases {
  /**
   * @param refundRepository Repository for refund persistence operations
   * @param saleRepository Repository for sale operations
   * @param catalogService Service for catalog operations
   */
  constructor(
    private readonly refundRepository: IRefundRepository,
    private readonly saleRepository: ISaleRepository,
    private readonly catalogService: ICatalogService
  ) {}

  /**
   * Creates a new refund transaction with validation and stock updates.
   * @param dto Data Transfer Object for refund creation
   * @returns Promise resolving to the created refund response
   */
  async createRefund(dto: CreateRefundDTO): Promise<RefundResponseDTO> {
    // Validate that the sale exists and is refundable
    const sale = await this.saleRepository.findById(dto.saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    if (!sale.isRefundable()) {
      throw new Error('Sale is not refundable');
    }

    // If lines are not provided, derive them from the sale
    let refundLines: Array<{productId: number, quantity: number, unitPrice: number}>;
    if (!dto.lines || dto.lines.length === 0) {
      // Full refund - refund all sale lines
      refundLines = sale.lines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice
      }));
    } else {
      // Partial refund - use provided lines
      refundLines = dto.lines;
    }

    // Calculate total
    const total = refundLines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    
    // Create refund line entities
    const refundLineEntities = refundLines.map((lineDto, index) => 
      new RefundLine(lineDto.productId, lineDto.quantity, lineDto.unitPrice, 0, index)
    );

    // Create refund entity
    const refund = new Refund(
      0, // ID will be assigned by the database
      new Date(),
      total,
      dto.saleId,
      dto.storeId || sale.storeId,
      dto.userId || sale.userId,
      refundLineEntities,
      dto.reason
    );

    // Save refund
    const savedRefund = await this.refundRepository.save(refund);

    // Restore stock for refunded items
    await this.restoreStock(savedRefund);

    // Update sale status
    const existingRefunds = await this.refundRepository.findBySaleId(dto.saleId);
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.total, 0) + total;
    
    if (totalRefunded >= sale.total) {
      sale.markAsRefunded();
    } else {
      sale.markAsPartiallyRefunded();
    }
    
    await this.saleRepository.update(dto.saleId, sale);

    return this.toResponseDTO(savedRefund);
  }

  /**
   * Retrieves a refund by its ID.
   * @param id Refund ID
   * @returns Promise resolving to the refund response
   */
  async getRefund(id: number): Promise<RefundResponseDTO> {
    const refund = await this.refundRepository.findById(id);
    if (!refund) {
      throw new Error('Refund not found');
    }
    return this.toResponseDTO(refund);
  }

  /**
   * Retrieves all refunds with optional relations.
   * @returns Promise resolving to an array of refund responses
   */
  async getAllRefunds(): Promise<RefundResponseDTO[]> {
    if (this.refundRepository.findAllWithRelationsRaw) {
      // Use method with raw relations for full data
      const refundsWithRelations = await this.refundRepository.findAllWithRelationsRaw();
      return refundsWithRelations.map(refund => this.toResponseDTOWithRelations(refund));
    } else {
      // Fallback to entity method
      const refunds = await this.refundRepository.findAll();
      return refunds.map(refund => this.toResponseDTO(refund));
    }
  }

  /**
   * Retrieves all refunds for a specific user.
   * @param userId User ID
   * @returns Promise resolving to an array of refund responses
   */
  async getRefundsByUser(userId: number): Promise<RefundResponseDTO[]> {
    if (this.refundRepository.findByUserIdWithRelationsRaw) {
      // Use method with raw relations for full data
      const refundsWithRelations = await this.refundRepository.findByUserIdWithRelationsRaw(userId);
      return refundsWithRelations.map(refund => this.toResponseDTOWithRelations(refund));
    } else if (this.refundRepository.findByUserIdWithRelations) {
      // Use method with relations for full data
      const refundsWithRelations = await this.refundRepository.findByUserIdWithRelations(userId);
      return refundsWithRelations.map(refund => this.toResponseDTOWithRelations(refund));
    } else {
      // Fallback to entity method
      const refunds = await this.refundRepository.findByUserId(userId);
      return refunds.map(refund => this.toResponseDTO(refund));
    }
  }

  /**
   * Retrieves all refunds for a specific store.
   * @param storeId Store ID
   * @returns Promise resolving to an array of refund responses
   */
  async getRefundsByStore(storeId: number): Promise<RefundResponseDTO[]> {
    const refunds = await this.refundRepository.findByStoreId(storeId);
    return refunds.map(refund => this.toResponseDTO(refund));
  }

  /**
   * Retrieves all refunds for a specific sale.
   * @param saleId Sale ID
   * @returns Promise resolving to an array of refund responses
   */
  async getRefundsBySale(saleId: number): Promise<RefundResponseDTO[]> {
    const refunds = await this.refundRepository.findBySaleId(saleId);
    return refunds.map(refund => this.toResponseDTO(refund));
  }

  /**
   * Gets refunds summary statistics for a date range.
   * @param startDate Start date for the summary period
   * @param endDate End date for the summary period
   * @returns Promise resolving to refunds summary data
   */
  async getRefundsSummary(startDate: Date, endDate: Date): Promise<RefundsSummaryDTO> {
    const refunds = await this.refundRepository.findByDateRange(startDate, endDate);
    const sales = await this.saleRepository.findByDateRange(startDate, endDate);
    
    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce((sum, refund) => sum + refund.total, 0);
    const totalSalesAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
    const refundRate = totalSalesAmount > 0 ? (totalRefundAmount / totalSalesAmount) * 100 : 0;

    return {
      totalRefunds,
      totalRefundAmount,
      refundRate,
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };
  }

  /**
   * Converts a Refund entity to a RefundResponseDTO.
   * @param refund Refund entity
   * @returns Refund response DTO
   */
  private toResponseDTO(refund: Refund): RefundResponseDTO {
    return {
      id: refund.id,
      date: refund.date,
      total: refund.total,
      reason: refund.reason ?? '',
      storeId: refund.storeId,
      userId: refund.userId,
      saleId: refund.saleId,
      lines: refund.lines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.getLineTotal()
      }))
    };
  }

  private toResponseDTOWithRelations(refundData: any): RefundResponseDTO {
    return {
      id: refundData.id,
      date: refundData.date,
      total: refundData.total,
      reason: refundData.reason ?? '',
      storeId: refundData.storeId,
      userId: refundData.userId,
      saleId: refundData.saleId,
      lines: refundData.lines.map((line: any) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.quantity * line.unitPrice,
        product: line.product ? {
          id: line.product.id,
          name: line.product.name,
          price: line.product.price
        } : undefined
      })),
      store: refundData.store ? {
        id: refundData.store.id,
        name: refundData.store.name
      } : undefined,
      user: refundData.user ? {
        id: refundData.user.id,
        name: refundData.user.name
      } : undefined,
      sale: refundData.sale ? {
        id: refundData.sale.id
      } : undefined
    };
  }

  private async restoreStock(refund: Refund): Promise<void> {
    console.log(`Restoring stock for refund ${refund.id}`);
    
    // Process each refund line to restore stock
    for (const line of refund.lines) {
      try {
        const stockAdjustment = {
          storeId: refund.storeId,
          productId: line.productId,
          quantity: line.quantity, // Positive quantity to increase stock
          reason: 'REFUND' as const
        };

        console.log(`Restoring stock for product ${line.productId}: +${line.quantity} units`);
        
        const result = await this.catalogService.adjustStock(stockAdjustment);
        
        if (!result.success) {
          console.error(`Failed to restore stock for product ${line.productId}: ${result.error}`);
          // Continue processing other items even if one fails
        } else {
          console.log(`Successfully restored stock for product ${line.productId}`);
        }
      } catch (error) {
        console.error(`Error restoring stock for product ${line.productId}:`, error);
        // Continue processing other items even if one fails
      }
    }
  }
}
