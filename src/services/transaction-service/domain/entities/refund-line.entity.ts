// RefundLine Entity - Individual line item in a refund
export class RefundLine {
  constructor(
    public readonly productId: number,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly refundId: number,
    public readonly id?: number
  ) {}

  getLineTotal(): number {
    return this.quantity * this.unitPrice;
  }

  isValid(): boolean {
    return this.quantity > 0 && this.unitPrice >= 0;
  }
}
