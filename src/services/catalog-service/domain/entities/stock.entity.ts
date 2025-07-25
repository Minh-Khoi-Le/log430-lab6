// Stock Entity - Inventory levels for products at specific stores
export class Stock {
  constructor(
    public readonly storeId: number,
    public readonly productId: number,
    public quantity: number,
    public readonly id: number = 0
  ) {}

  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }
    this.quantity = newQuantity;
  }

  reserve(amount: number): boolean {
    if (this.quantity >= amount) {
      this.quantity -= amount;
      return true;
    }
    return false;
  }

  restore(amount: number): void {
    this.quantity += amount;
  }

  isLowStock(threshold: number = 10): boolean {
    return this.quantity < threshold;
  }

  isOutOfStock(): boolean {
    return this.quantity === 0;
  }

  // Factory method to create from plain data
  static fromData(data: { storeId: number; productId: number; quantity: number }): Omit<Stock, 'id'> {
    const stock = new Stock(data.storeId, data.productId, data.quantity);
    return {
      storeId: stock.storeId,
      productId: stock.productId,
      quantity: stock.quantity,
      updateQuantity: stock.updateQuantity.bind(stock),
      reserve: stock.reserve.bind(stock),
      restore: stock.restore.bind(stock),
      isLowStock: stock.isLowStock.bind(stock),
      isOutOfStock: stock.isOutOfStock.bind(stock)
    };
  }
}
