// Base Domain Event interface
export interface DomainEvent {
  aggregateId: string;
  eventType: string;
  occurredOn: Date;
  eventData: any;
}

// Stock-related events for real-time inventory updates
export interface StockUpdatedEvent extends DomainEvent {
  eventType: 'STOCK_UPDATED';
  eventData: {
    storeId: number;
    productId: number;
    oldQuantity: number;
    newQuantity: number;
    reason: 'SALE' | 'REFUND' | 'ADJUSTMENT';
  };
}

export interface StockReservedEvent extends DomainEvent {
  eventType: 'STOCK_RESERVED';
  eventData: {
    storeId: number;
    productId: number;
    quantity: number;
    saleId: number;
  };
}

export interface StockReleasedEvent extends DomainEvent {
  eventType: 'STOCK_RELEASED';
  eventData: {
    storeId: number;
    productId: number;
    quantity: number;
    reason: 'SALE_CANCELLED' | 'REFUND_PROCESSED';
  };
}

// Sale-related events
export interface SaleCreatedEvent extends DomainEvent {
  eventType: 'SALE_CREATED';
  eventData: {
    saleId: number;
    userId: number;
    storeId: number;
    total: number;
    items: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

export interface SaleCompletedEvent extends DomainEvent {
  eventType: 'SALE_COMPLETED';
  eventData: {
    saleId: number;
    userId: number;
    storeId: number;
    total: number;
  };
}

// Refund-related events
export interface RefundCreatedEvent extends DomainEvent {
  eventType: 'REFUND_CREATED';
  eventData: {
    refundId: number;
    saleId: number;
    userId: number;
    storeId: number;
    total: number;
    reason?: string;
  };
}

export interface RefundCompletedEvent extends DomainEvent {
  eventType: 'REFUND_COMPLETED';
  eventData: {
    refundId: number;
    saleId: number;
    userId: number;
    storeId: number;
    total: number;
  };
}
