// Transaction Aggregate - Manages Sale-Refund lifecycle
import { Sale } from '../entities/sale.entity';
import { SaleLine } from '../entities/sale-line.entity';
import { Refund } from '../entities/refund.entity';
import { RefundLine } from '../entities/refund-line.entity';
import { DomainEvent } from '@shared/domain/events/domain-events';

export class TransactionAggregate {
  private readonly sales: Map<number, Sale> = new Map();
  private readonly refunds: Map<number, Refund> = new Map();
  private events: DomainEvent[] = [];

  // Sale management
  createSale(
    userId: number,
    storeId: number,
    lines: Array<{ productId: number; quantity: number; unitPrice: number }>
  ): Sale {
    const total = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const saleId = this.generateId();
    
    const saleLines = lines.map(line => new SaleLine(
      line.productId,
      line.quantity,
      line.unitPrice,
      saleId
    ));

    const sale = new Sale(
      saleId,
      new Date(),
      total,
      'active',
      storeId,
      userId,
      saleLines
    );

    this.sales.set(saleId, sale);

    // Emit domain event
    this.events.push({
      aggregateId: saleId.toString(),
      eventType: 'SALE_CREATED',
      occurredOn: new Date(),
      eventData: {
        saleId,
        userId,
        storeId,
        total,
        items: lines
      }
    });

    return sale;
  }

  completeSale(saleId: number): void {
    const sale = this.sales.get(saleId);
    if (sale) {
      sale.markAsCompleted();
      
      this.events.push({
        aggregateId: saleId.toString(),
        eventType: 'SALE_COMPLETED',
        occurredOn: new Date(),
        eventData: {
          saleId,
          userId: sale.userId,
          storeId: sale.storeId,
          total: sale.total
        }
      });
    }
  }

  // Refund management
  createRefund(
    saleId: number,
    userId: number,
    storeId: number,
    lines: Array<{ productId: number; quantity: number; unitPrice: number }>,
    reason?: string
  ): Refund | null {
    const originalSale = this.sales.get(saleId);
    if (!originalSale) {
      throw new Error('Original sale not found');
    }

    // Validate refund against original sale
    if (!this.validateRefund(originalSale, lines)) {
      return null;
    }

    const total = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const refundId = this.generateId();
    
    const refundLines = lines.map(line => new RefundLine(
      line.productId,
      line.quantity,
      line.unitPrice,
      refundId
    ));

    const refund = new Refund(
      refundId,
      new Date(),
      total,
      saleId,
      storeId,
      userId,
      refundLines,
      reason
    );

    this.refunds.set(refundId, refund);

    // Update sale status
    this.updateSaleStatusAfterRefund(originalSale, total);

    // Emit domain event
    this.events.push({
      aggregateId: refundId.toString(),
      eventType: 'REFUND_CREATED',
      occurredOn: new Date(),
      eventData: {
        refundId,
        saleId,
        userId,
        storeId,
        total,
        reason
      }
    });

    return refund;
  }

  // Business rule validation
  private validateRefund(
    originalSale: Sale,
    refundLines: Array<{ productId: number; quantity: number; unitPrice: number }>
  ): boolean {
    // Check if sale is refundable
    if (originalSale.status === 'refunded') {
      return false;
    }

    // Validate each refund line against original sale lines
    for (const refundLine of refundLines) {
      const originalLine = originalSale.lines.find(line => line.productId === refundLine.productId);
      
      if (!originalLine) {
        return false; // Product not in original sale
      }

      // Calculate already refunded quantity for this product
      const alreadyRefunded = this.getRefundedQuantity(originalSale.id, refundLine.productId);
      
      if (alreadyRefunded + refundLine.quantity > originalLine.quantity) {
        return false; // Cannot refund more than originally sold
      }

      // Check if price matches (allow small floating point differences)
      if (Math.abs(originalLine.unitPrice - refundLine.unitPrice) > 0.01) {
        return false; // Price mismatch
      }
    }

    return true;
  }

  private getRefundedQuantity(saleId: number, productId: number): number {
    return Array.from(this.refunds.values())
      .filter(refund => refund.saleId === saleId)
      .flatMap(refund => refund.lines)
      .filter(line => line.productId === productId)
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  private updateSaleStatusAfterRefund(sale: Sale, refundAmount: number): void {
    const totalRefunded = Array.from(this.refunds.values())
      .filter(refund => refund.saleId === sale.id)
      .reduce((sum, refund) => sum + refund.total, 0);

    if (totalRefunded >= sale.total) {
      sale.status = 'refunded';
    } else if (totalRefunded > 0) {
      sale.status = 'partially_refunded';
    }
  }

  // Query methods
  getSale(saleId: number): Sale | undefined {
    return this.sales.get(saleId);
  }

  getUserSales(userId: number): Sale[] {
    return Array.from(this.sales.values())
      .filter(sale => sale.userId === userId);
  }

  getStoreSales(storeId: number): Sale[] {
    return Array.from(this.sales.values())
      .filter(sale => sale.storeId === storeId);
  }

  getUserRefunds(userId: number): Refund[] {
    return Array.from(this.refunds.values())
      .filter(refund => refund.userId === userId);
  }

  getSaleRefunds(saleId: number): Refund[] {
    return Array.from(this.refunds.values())
      .filter(refund => refund.saleId === saleId);
  }

  // Event handling
  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }

  markEventsAsCommitted(): void {
    this.events = [];
  }

  // Utility
  private generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }
}
