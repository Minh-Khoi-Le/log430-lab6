// SaleLine Entity - Individual line item in a sale
export class SaleLine {
  constructor(
    public readonly productId: number,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly saleId: number,
    public readonly id?: number
  ) {}

  getLineTotal(): number {
    return this.quantity * this.unitPrice;
  }

  isValid(): boolean {
    return this.quantity > 0 && this.unitPrice >= 0;
  }
}
