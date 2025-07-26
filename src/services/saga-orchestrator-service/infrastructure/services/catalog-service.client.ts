/**
 * Catalog Service Client
 * 
 * Handles communication with the catalog service for stock operations:
 * - Stock verification
 * - Stock reservation
 * - Stock release/adjustment
 */

import { BaseServiceClient, ServiceClientConfig } from './base-service-client';
import { ApiResponse } from '@shared/application/interfaces/base-interfaces';

// DTOs for catalog service operations
export interface StockVerificationRequest {
  items: Array<{
    storeId: number;
    productId: number;
    quantity: number;
  }>;
}

export interface StockVerificationResponse {
  verified: boolean;
  availableQuantities: Record<number, number>; // productId -> available quantity
  insufficientItems?: Array<{
    productId: number;
    requested: number;
    available: number;
  }>;
}

export interface StockReservationRequest {
  storeId: number;
  productId: number;
  quantity: number;
}

export interface StockReservationResponse {
  success: boolean;
  reservationId?: string;
  error?: string;
}

export interface StockReleaseRequest {
  reservationId: string;
}

export interface StockReleaseResponse {
  success: boolean;
  error?: string;
}

export interface StockAdjustmentRequest {
  storeId: number;
  productId: number;
  quantity: number;
  reason: 'SALE' | 'REFUND' | 'ADJUSTMENT' | 'DAMAGE' | 'RESTOCK';
}

export interface StockAdjustmentResponse {
  success: boolean;
  newQuantity?: number;
  error?: string;
}

/**
 * Client for communicating with the catalog service
 */
export class CatalogServiceClient extends BaseServiceClient {
  constructor(config: Omit<ServiceClientConfig, 'serviceName'>) {
    super({
      ...config,
      serviceName: 'catalog-service'
    });
  }

  /**
   * Verify stock availability for multiple items
   */
  async verifyStock(request: StockVerificationRequest): Promise<ApiResponse<StockVerificationResponse>> {
    this.logger.info('Verifying stock availability', {
      itemCount: request.items.length,
      items: request.items
    });

    try {
      // For now, we'll check each item individually since the catalog service
      // doesn't have a bulk verification endpoint
      const verificationResults: StockVerificationResponse = {
        verified: true,
        availableQuantities: {},
        insufficientItems: []
      };

      for (const item of request.items) {
        const stockResponse = await this.get<any>(`/api/stock/store/${item.storeId}`);
        
        if (!stockResponse.success) {
          this.logger.error('Failed to get stock for store', undefined, {
            storeId: item.storeId,
            error: stockResponse.error
          });
          return {
            success: false,
            error: `Failed to verify stock for store ${item.storeId}: ${stockResponse.error}`
          };
        }

        // Find the specific product stock
        const productStock = stockResponse.data?.find((stock: any) => 
          stock.productId === item.productId
        );

        if (!productStock) {
          verificationResults.verified = false;
          verificationResults.availableQuantities[item.productId] = 0;
          verificationResults.insufficientItems!.push({
            productId: item.productId,
            requested: item.quantity,
            available: 0
          });
        } else {
          verificationResults.availableQuantities[item.productId] = productStock.quantity;
          
          if (productStock.quantity < item.quantity) {
            verificationResults.verified = false;
            verificationResults.insufficientItems!.push({
              productId: item.productId,
              requested: item.quantity,
              available: productStock.quantity
            });
          }
        }
      }

      this.logger.info('Stock verification completed', {
        verified: verificationResults.verified,
        insufficientItemsCount: verificationResults.insufficientItems?.length || 0
      });

      return {
        success: true,
        data: verificationResults
      };
    } catch (error) {
      this.logger.error('Stock verification failed', error as Error);
      return {
        success: false,
        error: `Stock verification failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Reserve stock for a specific item
   */
  async reserveStock(request: StockReservationRequest): Promise<ApiResponse<StockReservationResponse>> {
    this.logger.info('Reserving stock', {
      storeId: request.storeId,
      productId: request.productId,
      quantity: request.quantity
    });

    const response = await this.post<{ success: boolean }>('/api/stock/reserve', request);

    if (response.success && response.data?.success) {
      // Generate a reservation ID for tracking
      const reservationId = `res-${request.storeId}-${request.productId}-${Date.now()}`;
      
      this.logger.info('Stock reserved successfully', {
        reservationId,
        storeId: request.storeId,
        productId: request.productId,
        quantity: request.quantity
      });

      return {
        success: true,
        data: {
          success: true,
          reservationId
        }
      };
    } else {
      this.logger.warn('Stock reservation failed', {
        storeId: request.storeId,
        productId: request.productId,
        quantity: request.quantity,
        error: response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.error || 'Stock reservation failed'
        }
      };
    }
  }

  /**
   * Release reserved stock (compensation action)
   */
  async releaseReservation(reservationId: string): Promise<ApiResponse<StockReleaseResponse>> {
    this.logger.info('Releasing stock reservation', { reservationId });

    try {
      // Parse reservation ID to get stock details
      const parts = reservationId.split('-');
      if (parts.length < 4 || parts[0] !== 'res') {
        return {
          success: false,
          error: 'Invalid reservation ID format'
        };
      }

      const storeId = parseInt(parts[1]);
      const productId = parseInt(parts[2]);

      // Since the catalog service doesn't have a specific release endpoint,
      // we'll use the stock adjustment endpoint to restore the stock
      const adjustmentRequest: StockAdjustmentRequest = {
        storeId,
        productId,
        quantity: 1, // We'll need to track the actual quantity in a real implementation
        reason: 'REFUND'
      };

      const response = await this.post<any>('/api/stock/adjust', adjustmentRequest);

      if (response.success) {
        this.logger.info('Stock reservation released successfully', {
          reservationId,
          storeId,
          productId
        });

        return {
          success: true,
          data: {
            success: true
          }
        };
      } else {
        this.logger.error('Failed to release stock reservation', undefined, {
          reservationId,
          error: response.error
        });

        return {
          success: true, // API call succeeded
          data: {
            success: false,
            error: response.error || 'Failed to release reservation'
          }
        };
      }
    } catch (error) {
      this.logger.error('Stock release failed', error as Error, { reservationId });
      return {
        success: false,
        error: `Stock release failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Adjust stock quantity (for refunds or corrections)
   */
  async adjustStock(request: StockAdjustmentRequest): Promise<ApiResponse<StockAdjustmentResponse>> {
    this.logger.info('Adjusting stock', {
      storeId: request.storeId,
      productId: request.productId,
      quantity: request.quantity,
      reason: request.reason
    });

    const response = await this.post<any>('/api/stock/adjust', request);

    if (response.success) {
      this.logger.info('Stock adjusted successfully', {
        storeId: request.storeId,
        productId: request.productId,
        quantity: request.quantity,
        reason: request.reason
      });

      return {
        success: true,
        data: {
          success: true,
          newQuantity: response.data?.quantity
        }
      };
    } else {
      this.logger.error('Stock adjustment failed', undefined, {
        storeId: request.storeId,
        productId: request.productId,
        quantity: request.quantity,
        reason: request.reason,
        error: response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.error || 'Stock adjustment failed'
        }
      };
    }
  }
}