/**
 * Payment Processing Step
 * 
 * Processes payment for the sale after successful stock reservation.
 * This step supports compensation by refunding the processed payment if the saga fails
 * in later steps.
 */

import { BaseSagaStep } from '../../application/steps/base-saga-step';
import { StepResult, CompensationResult } from '../../application/interfaces/saga-step.interface';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { TransactionServiceClient, PaymentProcessingRequest } from '../services/transaction-service.client';

/**
 * Step to process payment for the sale
 */
export class PaymentProcessingStep extends BaseSagaStep {
  constructor(private readonly transactionServiceClient: TransactionServiceClient) {
    super('Payment Processing');
  }

  /**
   * Execute payment processing for the sale
   */
  protected async executeStep(context: SagaContext): Promise<StepResult> {
    const totalAmount = this.calculateTotalAmount(context);
    
    this.logger.info('Starting payment processing', {
      correlationId: this.getCorrelationId(context),
      userId: context.saleRequest.userId,
      storeId: context.saleRequest.storeId,
      totalAmount: this.formatCurrency(totalAmount),
      itemCount: context.saleRequest.lines.length
    });

    try {
      // Validate that stock reservation was completed successfully
      if (!context.stockReservation || !context.stockReservation.reservationId) {
        throw new Error('Payment processing cannot proceed without successful stock reservation');
      }

      // Prepare payment processing request
      const paymentRequest: PaymentProcessingRequest = {
        userId: context.saleRequest.userId,
        storeId: context.saleRequest.storeId,
        amount: totalAmount,
        paymentMethod: 'credit_card', // Default payment method
        metadata: {
          reservationId: context.stockReservation.reservationId,
          itemCount: context.saleRequest.lines.length,
          items: context.saleRequest.lines.map(line => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice
          }))
        }
      };

      this.logger.info('Calling transaction service for payment processing', {
        correlationId: this.getCorrelationId(context),
        amount: totalAmount,
        paymentMethod: paymentRequest.paymentMethod
      });

      // Call transaction service to process payment
      const paymentResponse = await this.executeWithTimeout(
        this.transactionServiceClient.processPayment(paymentRequest),
        10000, // 10 second timeout
        'Payment processing'
      );

      if (!paymentResponse.success) {
        this.logger.error('Payment processing service call failed', undefined, {
          correlationId: this.getCorrelationId(context),
          error: paymentResponse.error
        });

        return {
          success: false,
          error: `Payment processing failed: ${paymentResponse.error}`,
          nextState: this.getFailureState(context)
        };
      }

      const paymentData = paymentResponse.data!;

      if (paymentData.success && paymentData.transactionId) {
        // Payment processed successfully
        this.logger.info('Payment processed successfully', {
          correlationId: this.getCorrelationId(context),
          transactionId: paymentData.transactionId,
          amount: paymentData.amount,
          status: paymentData.status
        });

        // Update saga context with payment results
        const contextUpdate = {
          payment: {
            transactionId: paymentData.transactionId,
            amount: paymentData.amount || totalAmount,
            status: paymentData.status || 'completed'
          }
        };

        return {
          success: true,
          data: contextUpdate,
          nextState: this.getNextState(context)
        };
      } else {
        // Payment processing failed
        const errorMessage = paymentData.error || 'Payment processing failed';
        
        this.logger.warn('Payment processing failed', {
          correlationId: this.getCorrelationId(context),
          amount: totalAmount,
          error: errorMessage
        });

        return {
          success: false,
          error: `Payment declined: ${errorMessage}`,
          nextState: this.getFailureState(context)
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during payment processing';
      
      this.logger.error('Payment processing step failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context),
        amount: totalAmount
      });

      return {
        success: false,
        error: `Payment processing failed: ${errorMessage}`,
        nextState: this.getFailureState(context)
      };
    }
  }

  /**
   * Compensate by refunding the processed payment
   */
  protected async compensateStep(context: SagaContext): Promise<CompensationResult> {
    this.logger.info('Starting payment processing compensation', {
      correlationId: this.getCorrelationId(context)
    });

    try {
      if (!context.payment || !context.payment.transactionId) {
        this.logger.info('No payment to compensate', {
          correlationId: this.getCorrelationId(context)
        });

        return {
          success: true
        };
      }

      const transactionId = context.payment.transactionId;
      const refundAmount = context.payment.amount;

      this.logger.info('Processing payment refund', {
        correlationId: this.getCorrelationId(context),
        transactionId,
        refundAmount: this.formatCurrency(refundAmount)
      });

      // Call transaction service to refund payment
      const refundResponse = await this.executeWithTimeout(
        this.transactionServiceClient.refundPayment(
          transactionId,
          refundAmount,
          'Saga compensation - transaction failed'
        ),
        10000, // 10 second timeout
        'Payment refund'
      );

      if (!refundResponse.success) {
        this.logger.error('Payment refund service call failed', undefined, {
          correlationId: this.getCorrelationId(context),
          transactionId,
          error: refundResponse.error
        });

        return {
          success: false,
          error: `Payment refund failed: ${refundResponse.error}`
        };
      }

      const refundData = refundResponse.data!;

      if (refundData.success && refundData.refundId) {
        // Refund processed successfully
        this.logger.info('Payment refunded successfully', {
          correlationId: this.getCorrelationId(context),
          transactionId,
          refundId: refundData.refundId,
          refundedAmount: this.formatCurrency(refundData.refundedAmount || refundAmount)
        });

        return {
          success: true
        };
      } else {
        // Refund processing failed
        const errorMessage = refundData.error || 'Payment refund failed';
        
        this.logger.error('Payment refund failed', undefined, {
          correlationId: this.getCorrelationId(context),
          transactionId,
          error: errorMessage
        });

        return {
          success: false,
          error: `Payment refund failed: ${errorMessage}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during payment compensation';
      
      this.logger.error('Payment processing compensation failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context)
      });

      return {
        success: false,
        error: `Payment compensation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Payment processing supports compensation
   */
  public canCompensate(): boolean {
    return true;
  }

  /**
   * Get the next state after successful payment processing
   */
  public getNextState(context: SagaContext): SagaState {
    return SagaState.PAYMENT_PROCESSED;
  }

  /**
   * Get the failure state when payment processing fails
   */
  public getFailureState(context: SagaContext): SagaState {
    return SagaState.PAYMENT_FAILED;
  }

  /**
   * Validate context specific to payment processing
   */
  protected validateContext(context: SagaContext): void {
    super.validateContext(context);

    // Validate that stock reservation was completed
    if (!context.stockReservation) {
      throw new Error('Stock reservation context is required for payment processing');
    }

    if (!context.stockReservation.reservationId) {
      throw new Error('Payment processing cannot proceed without successful stock reservation');
    }

    if (!context.stockReservation.reservedItems || context.stockReservation.reservedItems.length === 0) {
      throw new Error('No reserved items found for payment processing');
    }

    // Validate that stock verification was completed
    if (!context.stockVerification || !context.stockVerification.verified) {
      throw new Error('Payment processing cannot proceed without successful stock verification');
    }

    // Validate sale request amounts
    const totalAmount = this.calculateTotalAmount(context);
    if (totalAmount <= 0) {
      throw new Error(`Invalid total amount for payment: ${totalAmount}`);
    }

    // Validate individual line items
    for (const line of context.saleRequest.lines) {
      if (line.unitPrice < 0) {
        throw new Error(`Invalid unit price for product ${line.productId}: ${line.unitPrice}`);
      }

      const lineTotal = line.quantity * line.unitPrice;
      if (lineTotal < 0) {
        throw new Error(`Invalid line total for product ${line.productId}: ${lineTotal}`);
      }
    }

    // Validate user ID for payment processing
    if (!context.saleRequest.userId || context.saleRequest.userId <= 0) {
      throw new Error(`Invalid user ID for payment: ${context.saleRequest.userId}`);
    }
  }
}