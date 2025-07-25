// Store Entity - Represents physical store locations
export class Store {
  constructor(
    public readonly id: number,
    public name: string,
    public address?: string
  ) {}

  updateDetails(name?: string, address?: string): void {
    if (name) this.name = name;
    if (address !== undefined) this.address = address;
  }

  isValid(): boolean {
    return this.name.length > 0;
  }

  // Factory method to create from plain data
  static fromData(data: { name: string; address?: string }): Omit<Store, 'id'> {
    const store = new Store(0, data.name, data.address);
    return {
      name: store.name,
      address: store.address,
      updateDetails: store.updateDetails.bind(store),
      isValid: store.isValid.bind(store)
    };
  }
}
