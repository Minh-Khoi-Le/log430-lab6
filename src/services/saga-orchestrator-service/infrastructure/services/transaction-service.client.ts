/**
 * Transaction Service Client
 * 
 * Handles communication with the transaction service for payment operations:
 * - Payment processing
 * - Payment refunds
 * - Sale creation and confirmation
 */

import { BaseServiceClient, ServiceClientConfig } from './base-service-client';
import { ApiResponse } from '@shared/application/interfaces/base-interfaces';

// DTOs for transaction service operations
export interface PaymentProcessingRequest {
  userId: number;
  storeId: number;
  amount: number;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export interface PaymentProcessingResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export interface PaymentRefundRequest {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundId?: string;
  refundedAmount?: number;
  error?: string;
}

export interface SaleCreationRequest {
  userId: number;
  storeId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface SaleCreationResponse {
  success: boolean;
  saleId?: number;
  total?: number;
  status?: string;
  error?: string;
}

export interface SaleStatusUpdateRequest {
  saleId: number;
  status: string;
}

export interface SaleStatusUpdateResponse {
  success: boolean;
  saleId?: number;
  newStatus?: string;
  error?: string;
}

/**
 * Client for communicating with the transaction service
 */
export class TransactionServiceClient extends BaseServiceClient {
  constructor(config: Omit<ServiceClientConfig, 'serviceName'>) {
    super({
      ...config,
      serviceName: 'transaction-service'
    });
  }

  /**
   * Process a payment for a sale
   */
  async processPayment(request: PaymentProcessingRequest): Promise<ApiResponse<PaymentProcessingResponse>> {
    this.logger.info('Processing payment', {
      userId: request.userId,
      storeId: request.storeId,
      amount: request.amount,
      paymentMethod: request.paymentMethod
    });

    try {
      // For now, we'll simulate payment processing since the transaction service
      // doesn't have a dedicated payment endpoint - it creates sales directly
      
      // In a real implementation, this would call a payment gateway
      // For the saga pattern, we'll simulate a payment transaction
      const transactionId = `txn-${request.userId}-${request.storeId}-${Date.now()}`;
      
      // Simulate payment processing delay and potential failures
      await this.delayOperation(100); // Small delay to simulate processing
      
      // Simulate payment success/failure (90% success rate for testing)
      const paymentSuccessful = Math.random() > 0.1;
      
      if (paymentSuccessful) {
        this.logger.info('Payment processed successfully', {
          transactionId,
          userId: request.userId,
          amount: request.amount
        });

        return {
          success: true,
          data: {
            success: true,
            transactionId,
            amount: request.amount,
            status: 'completed'
          }
        };
      } else {
        this.logger.warn('Payment processing failed', {
          userId: request.userId,
          amount: request.amount,
          reason: 'Payment declined'
        });

        return {
          success: true, // API call succeeded
          data: {
            success: false,
            error: 'Payment declined by payment processor'
          }
        };
      }
    } catch (error) {
      this.logger.error('Payment processing failed', error as Error, {
        userId: request.userId,
        amount: request.amount
      });

      return {
        success: false,
        error: `Payment processing failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Refund a payment (compensation action)
   */
  async refundPayment(transactionId: string, amount?: number, reason?: string): Promise<ApiResponse<PaymentRefundResponse>> {
    this.logger.info('Processing payment refund', {
      transactionId,
      amount,
      reason
    });

    try {
      // Create refund request
      const refundRequest = {
        transactionId,
        amount,
        reason: reason || 'Saga compensation',
        date: new Date()
      };

      const response = await this.post<any>('/api/refunds', refundRequest);

      if (response.success) {
        this.logger.info('Payment refunded successfully', {
          transactionId,
          refundId: response.data?.id,
          refundedAmount: response.data?.total
        });

        return {
          success: true,
          data: {
            success: true,
            refundId: response.data?.id?.toString(),
            refundedAmount: response.data?.total
          }
        };
      } else {
        this.logger.error('Payment refund failed', undefined, {
          transactionId,
          error: response.error
        });

        return {
          success: true, // API call succeeded
          data: {
            success: false,
            error: response.error || 'Refund processing failed'
          }
        };
      }
    } catch (error) {
      this.logger.error('Payment refund failed', error as Error, { transactionId });
      return {
        success: false,
        error: `Payment refund failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create a sale record
   */
  async createSale(request: SaleCreationRequest): Promise<ApiResponse<SaleCreationResponse>> {
    this.logger.info('Creating sale', {
      userId: request.userId,
      storeId: request.storeId,
      lineCount: request.lines.length,
      total: request.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0)
    });

    const response = await this.post<any>('/api/sales', request);

    if (response.success) {
      this.logger.info('Sale created successfully', {
        saleId: response.data?.id,
        userId: request.userId,
        storeId: request.storeId,
        total: response.data?.total
      });

      return {
        success: true,
        data: {
          success: true,
          saleId: response.data?.id,
          total: response.data?.total,
          status: response.data?.status
        }
      };
    } else {
      this.logger.error('Sale creation failed', undefined, {
        userId: request.userId,
        storeId: request.storeId,
        error: response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.error || 'Sale creation failed'
        }
      };
    }
  }

  /**
   * Update sale status
   */
  async updateSaleStatus(saleId: number, status: string): Promise<ApiResponse<SaleStatusUpdateResponse>> {
    this.logger.info('Updating sale status', {
      saleId,
      newStatus: status
    });

    const response = await this.put<any>(`/api/sales/${saleId}/status`, { status });

    if (response.success) {
      this.logger.info('Sale status updated successfully', {
        saleId,
        newStatus: response.data?.status
      });

      return {
        success: true,
        data: {
          success: true,
          saleId,
          newStatus: response.data?.status
        }
      };
    } else {
      this.logger.error('Sale status update failed', undefined, {
        saleId,
        status,
        error: response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.error || 'Sale status update failed'
        }
      };
    }
  }

  /**
   * Get sale details by ID
   */
  async getSale(saleId: number): Promise<ApiResponse<any>> {
    this.logger.info('Retrieving sale details', { saleId });

    const response = await this.get<any>(`/api/sales/${saleId}`);

    if (response.success) {
      this.logger.info('Sale details retrieved successfully', {
        saleId,
        status: response.data?.status,
        total: response.data?.total
      });
    } else {
      this.logger.error('Failed to retrieve sale details', undefined, {
        saleId,
        error: response.error
      });
    }

    return response;
  }

  /**
   * Utility method for delays in simulated operations
   */
  private delayOperation(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}