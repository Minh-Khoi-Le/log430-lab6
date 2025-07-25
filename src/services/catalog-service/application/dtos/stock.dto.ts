// Stock Data Transfer Objects

export interface CreateStockDTO {
  storeId: number;
  productId: number;
  quantity: number;
}

export interface UpdateStockDTO {
  quantity: number;
}

export interface StockResponseDTO {
  id: number;
  storeId: number;
  productId: number;
  quantity: number;
  storeName?: string;
  productName?: string;
  unitPrice?: number;
}

export interface StockReservationDTO {
  storeId: number;
  productId: number;
  quantity: number;
}

export interface StockAdjustmentDTO {
  storeId: number;
  productId: number;
  quantity: number;
  reason: 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'DAMAGE' | 'RESTOCK';
}
