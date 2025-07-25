// Product Entity - Core business object for catalog items
export class Product {
  constructor(
    public readonly id: number,
    public name: string,
    public price: number,
    public description?: string
  ) {}

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.price = newPrice;
  }

  updateDetails(name?: string, description?: string): void {
    if (name) this.name = name;
    if (description !== undefined) this.description = description;
  }

  isValid(): boolean {
    return this.name.length > 0 && this.price >= 0;
  }

  // Factory method to create from plain data
  static fromData(data: { name: string; price: number; description?: string }): Omit<Product, 'id'> {
    const product = new Product(0, data.name, data.price, data.description);
    return {
      name: product.name,
      price: product.price,
      description: product.description,
      updatePrice: product.updatePrice.bind(product),
      updateDetails: product.updateDetails.bind(product),
      isValid: product.isValid.bind(product)
    };
  }
}
