// Sale Data Transfer Objects

export interface CreateSaleDTO {
  userId: number;
  storeId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface SaleLineDTO {
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

export interface SaleResponseDTO {
  id: number;
  date: Date;
  total: number;
  status: string;
  storeId: number;
  userId: number;
  lines: SaleLineDTO[];
  store?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    name: string;
  };
}

export interface SalesSummaryDTO {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  period: string;
}
