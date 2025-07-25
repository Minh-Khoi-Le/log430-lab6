// Sale Entity - Represents a sales transaction
import { SaleLine } from './sale-line.entity';

export class Sale {
  constructor(
    public readonly id: number,
    public readonly date: Date,
    public readonly total: number,
    public status: string,
    public readonly storeId: number,
    public readonly userId: number,
    public readonly lines: SaleLine[]
  ) {}

  markAsCompleted(): void {
    this.status = 'completed';
  }

  markAsRefunded(): void {
    this.status = 'refunded';
  }

  markAsPartiallyRefunded(): void {
    this.status = 'partially_refunded';
  }

  isRefundable(): boolean {
    return this.status === 'active' || this.status === 'completed';
  }

  getTotalItems(): number {
    return this.lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  getLineByProduct(productId: number): SaleLine | undefined {
    return this.lines.find(line => line.productId === productId);
  }
}
