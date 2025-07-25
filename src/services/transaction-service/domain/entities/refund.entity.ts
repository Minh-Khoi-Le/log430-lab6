// Refund Entity - Represents a refund transaction
import { RefundLine } from './refund-line.entity';

export class Refund {
  constructor(
    public readonly id: number,
    public readonly date: Date,
    public readonly total: number,
    public readonly saleId: number,
    public readonly storeId: number,
    public readonly userId: number,
    public readonly lines: RefundLine[],
    public readonly reason?: string
  ) {}

  getTotalItems(): number {
    return this.lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  getLineByProduct(productId: number): RefundLine | undefined {
    return this.lines.find(line => line.productId === productId);
  }

  isValid(): boolean {
    return this.lines.length > 0 && this.total > 0;
  }
}
