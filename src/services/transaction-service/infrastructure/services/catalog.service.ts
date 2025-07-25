import { HttpClient } from '@shared/infrastructure/http/http-client';

export interface StockAdjustmentRequest {
  storeId: number;
  productId: number;
  quantity: number;
  reason: 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'DAMAGE' | 'RESTOCK';
}

export interface StockAdjustmentResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export interface ICatalogService {
  adjustStock(adjustment: StockAdjustmentRequest): Promise<StockAdjustmentResponse>;
}

export class CatalogService implements ICatalogService {
  private readonly httpClient: HttpClient;

  constructor(catalogServiceUrl: string = 'http://catalog-service:3000') {
    this.httpClient = new HttpClient(catalogServiceUrl);
  }

  async adjustStock(adjustment: StockAdjustmentRequest): Promise<StockAdjustmentResponse> {
    try {
      console.log('Adjusting stock via catalog service:', adjustment);
      
      const response = await this.httpClient.post('/api/stock/adjust', adjustment);
      
      if (response.success) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to adjust stock'
        };
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
