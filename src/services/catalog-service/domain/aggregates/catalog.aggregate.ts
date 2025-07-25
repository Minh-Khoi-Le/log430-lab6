// Catalog Aggregate - Manages Product-Store-Stock relationships
// This aggregate ensures consistency across the catalog domain

import { Product } from '../entities/product.entity';
import { Store } from '../entities/store.entity';
import { Stock } from '../entities/stock.entity';
import { DomainEvent } from '../../../../shared/domain/events/domain-events';

export class CatalogAggregate {
  private readonly products: Map<number, Product> = new Map();
  private readonly stores: Map<number, Store> = new Map();
  private readonly stocks: Map<string, Stock> = new Map(); // key: `${storeId}-${productId}`
  private events: DomainEvent[] = [];

  // Product management
  addProduct(product: Product): void {
    this.products.set(product.id, product);
    // Create stock entries for all existing stores
    this.stores.forEach(store => {
      this.initializeStock(store.id, product.id);
    });
  }

  updateProduct(productId: number, updates: Partial<Product>): void {
    const product = this.products.get(productId);
    if (product) {
      Object.assign(product, updates);
    }
  }

  // Store management
  addStore(store: Store): void {
    this.stores.set(store.id, store);
    // Create stock entries for all existing products
    this.products.forEach(product => {
      this.initializeStock(store.id, product.id);
    });
  }

  updateStore(storeId: number, updates: Partial<Store>): void {
    const store = this.stores.get(storeId);
    if (store) {
      Object.assign(store, updates);
    }
  }

  // Stock management - Core business logic
  reserveStock(storeId: number, productId: number, quantity: number): boolean {
    const stockKey = `${storeId}-${productId}`;
    const stock = this.stocks.get(stockKey);
    
    if (!stock || stock.quantity < quantity) {
      return false; // Insufficient stock
    }

    const oldQuantity = stock.quantity;
    stock.quantity -= quantity;

    // Emit domain event for real-time updates
    this.events.push({
      aggregateId: stockKey,
      eventType: 'STOCK_RESERVED',
      occurredOn: new Date(),
      eventData: {
        storeId,
        productId,
        quantity,
        oldQuantity,
        newQuantity: stock.quantity
      }
    });

    return true;
  }

  updateStock(storeId: number, productId: number, newQuantity: number): void {
    const stockKey = `${storeId}-${productId}`;
    const stock = this.stocks.get(stockKey);
    
    if (stock) {
      const oldQuantity = stock.quantity;
      stock.quantity = newQuantity;

      this.events.push({
        aggregateId: stockKey,
        eventType: 'STOCK_UPDATED',
        occurredOn: new Date(),
        eventData: {
          storeId,
          productId,
          oldQuantity,
          newQuantity,
          reason: 'ADJUSTMENT'
        }
      });
    }
  }

  restoreStock(storeId: number, productId: number, quantity: number): void {
    const stockKey = `${storeId}-${productId}`;
    const stock = this.stocks.get(stockKey);
    
    if (stock) {
      stock.quantity += quantity;

      this.events.push({
        aggregateId: stockKey,
        eventType: 'STOCK_RELEASED',
        occurredOn: new Date(),
        eventData: {
          storeId,
          productId,
          quantity,
          reason: 'REFUND_PROCESSED'
        }
      });
    }
  }

  // Query methods
  getStock(storeId: number, productId: number): Stock | undefined {
    return this.stocks.get(`${storeId}-${productId}`);
  }

  getStoreInventory(storeId: number): Stock[] {
    return Array.from(this.stocks.values())
      .filter(stock => stock.storeId === storeId);
  }

  getProductInventory(productId: number): Stock[] {
    return Array.from(this.stocks.values())
      .filter(stock => stock.productId === productId);
  }

  getLowStockItems(threshold: number = 10): Stock[] {
    return Array.from(this.stocks.values())
      .filter(stock => stock.quantity < threshold);
  }

  // Event handling
  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }

  markEventsAsCommitted(): void {
    this.events = [];
  }

  // Private methods
  private initializeStock(storeId: number, productId: number): void {
    const stockKey = `${storeId}-${productId}`;
    if (!this.stocks.has(stockKey)) {
      this.stocks.set(stockKey, new Stock(storeId, productId, 0));
    }
  }
}
