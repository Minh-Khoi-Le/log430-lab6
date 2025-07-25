// Refund Data Transfer Objects

export interface CreateRefundDTO {
  userId?: number;
  storeId?: number;
  saleId: number;
  reason: string;
  lines?: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface RefundLineDTO {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: {
    id: number;
    name: string;
    price: number;
  };
}

export interface RefundResponseDTO {
  id: number;
  date: Date;
  total: number;
  reason: string;
  storeId: number;
  userId: number;
  saleId: number;
  lines: RefundLineDTO[];
  store?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
  sale?: {
    id: number;
  };
}

export interface RefundsSummaryDTO {
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  period: string;
}
