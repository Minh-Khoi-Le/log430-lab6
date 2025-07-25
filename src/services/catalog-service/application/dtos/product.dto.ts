// Product Data Transfer Objects

export interface CreateProductDTO {
  name: string;
  price: number;
  description?: string;
}

export interface UpdateProductDTO {
  name?: string;
  price?: number;
  description?: string;
}

export interface ProductResponseDTO {
  id: number;
  name: string;
  price: number;
  description?: string;
}

export interface ProductWithStockDTO extends ProductResponseDTO {
  totalStock: number;
  stockByStore: Array<{
    storeId: number;
    storeName: string;
    quantity: number;
  }>;
}
