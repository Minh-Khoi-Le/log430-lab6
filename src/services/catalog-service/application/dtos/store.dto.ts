// Store Data Transfer Objects

export interface CreateStoreDTO {
  name: string;
  address?: string;
}

export interface UpdateStoreDTO {
  name?: string;
  address?: string;
}

export interface StoreResponseDTO {
  id: number;
  name: string;
  address?: string;
}

export interface StoreWithInventoryDTO extends StoreResponseDTO {
  totalProducts: number;
  totalStock: number;
  inventory: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}
