/**
 * Saga Context Interface
 * 
 * Defines the structure of data that flows through the saga workflow
 */
export interface SagaContext {
  saleRequest: {
    userId: number;
    storeId: number;
    lines: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
    }>;
  };
  stockVerification?: {
    verified: boolean;
    availableQuantities: Record<number, number>;
  };
  stockReservation?: {
    reservationId: string;
    reservedItems: Array<{
      productId: number;
      quantity: number;
    }>;
  };
  payment?: {
    transactionId: string;
    amount: number;
    status: string;
  };
  saleResult?: {
    saleId: number;
    total: number;
  };
  compensationActions?: Array<{
    action: string;
    data: any;
    completed: boolean;
  }>;
}