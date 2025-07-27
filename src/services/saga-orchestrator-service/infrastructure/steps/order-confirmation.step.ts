/**
 * Order Confirmation Step
 * 
 * Creates the final sale record to confirm the order after successful payment processing.
 * This step supports full compensation by refunding payment and releasing stock reservations
 * if the order confirmation fails.
 */

import { BaseSagaStep } from '../../application/steps/base-saga-step';
import { StepResult, CompensationResult } from '../../application/interfaces/saga-step.interface';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { TransactionServiceClient, SaleCreationRequest } from '../services/transaction-service.client';
import { CatalogServiceClient } from '../services/catalog-service.client';

/**
 * Step to confirm the order by creating the final sale record
 */
export class OrderConfirmationStep extends BaseSagaStep {
  constructor(
    private readonly transactionServiceClient: TransactionServiceClient,
    private readonly catalogServiceClient: CatalogServiceClient
  ) {
    super('Order Confirmation');
  }

  /**
   * Execute order confirmation by creating the final sale record
   */
  protected async executeStep(context: SagaContext): Promise<StepResult> {
    const totalAmount = this.calculateTotalAmount(context);
    
    this.logger.info('Starting order confirmation', {
      correlationId: this.getCorrelationId(context),
      userId: context.saleRequest.userId,
      storeId: context.saleRequest.storeId,
      totalAmount: this.formatCurrency(totalAmount),
      itemCount: context.saleRequest.lines.length,
      transactionId: context.payment?.transactionId
    });

    try {
      // Validate that payment processing was completed successfully
      if (!context.payment || !context.payment.transactionId) {
        throw new Error('Order confirmation cannot proceed without successful payment processing');
      }

      // Validate that stock reservation was completed successfully
      if (!context.stockReservation || !context.stockReservation.reservationId) {
        throw new Error('Order confirmation cannot proceed without successful stock reservation');
      }

      // Prepare sale creation request
      const saleRequest: SaleCreationRequest = {
        userId: context.saleRequest.userId,
        storeId: context.saleRequest.storeId,
        lines: context.saleRequest.lines.map(line => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice
        }))
      };

      this.logger.info('Creating sale record', {
        correlationId: this.getCorrelationId(context),
        saleRequest: {
          userId: saleRequest.userId,
          storeId: saleRequest.storeId,
          lineCount: saleRequest.lines.length,
          totalAmount: this.formatCurrency(totalAmount)
        }
      });

      // Call transaction service to create sale record
      const saleResponse = await this.executeWithTimeout(
        this.transactionServiceClient.createSale(saleRequest),
        15000, // 15 second timeout for sale creation
        'Sale creation'
      );

      if (!saleResponse.success) {
        this.logger.error('Sale creation service call failed', undefined, {
          correlationId: this.getCorrelationId(context),
          error: saleResponse.error
        });

        return {
          success: false,
          error: `Order confirmation failed: ${saleResponse.error}`,
          nextState: this.getFailureState(context)
        };
      }

      const saleData = saleResponse.data!;

      if (saleData.success && saleData.saleId) {
        // Sale created successfully
        this.logger.info('Order confirmed successfully', {
          correlationId: this.getCorrelationId(context),
          saleId: saleData.saleId,
          total: this.formatCurrency(saleData.total || totalAmount),
          status: saleData.status
        });

        // Update saga context with sale results
        const contextUpdate = {
          saleResult: {
            saleId: saleData.saleId,
            total: saleData.total || totalAmount
          }
        };

        return {
          success: true,
          data: contextUpdate,
          nextState: this.getNextState(context)
        };
      } else {
        // Sale creation failed
        const errorMessage = saleData.error || 'Order confirmation failed';
        
        this.logger.error('Order confirmation failed', undefined, {
          correlationId: this.getCorrelationId(context),
          error: errorMessage
        });

        return {
          success: false,
          error: `Order confirmation failed: ${errorMessage}`,
          nextState: this.getFailureState(context)
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during order confirmation';
      
      this.logger.error('Order confirmation step failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context),
        totalAmount: this.formatCurrency(totalAmount)
      });

      return {
        success: false,
        error: `Order confirmation failed: ${errorMessage}`,
        nextState: this.getFailureState(context)
      };
    }
  }

  /**
   * Compensate by executing full compensation chain: refund payment and release stock
   */
  protected async compensateStep(context: SagaContext): Promise<CompensationResult> {
    this.logger.info('Starting order confirmation compensation (full compensation chain)', {
      correlationId: this.getCorrelationId(context)
    });

    const compensationResults: Array<{ action: string; success: boolean; error?: string }> = [];

    try {
      // Step 1: Refund payment if it exists
      if (context.payment && context.payment.transactionId) {
        this.logger.info('Compensating payment as part of order confirmation failure', {
          correlationId: this.getCorrelationId(context),
          transactionId: context.payment.transactionId,
          amount: this.formatCurrency(context.payment.amount)
        });

        try {
          const refundResponse = await this.executeWithTimeout(
            this.transactionServiceClient.refundPayment(
              context.payment.transactionId,
              context.payment.amount,
              'Order confirmation failed - full refund'
            ),
            10000, // 10 second timeout
            'Payment refund compensation'
          );

          if (refundResponse.success && refundResponse.data?.success) {
            this.logger.info('Payment refund compensation successful', {
              correlationId: this.getCorrelationId(context),
              transactionId: context.payment.transactionId,
              refundId: refundResponse.data.refundId
            });

            compensationResults.push({
              action: 'payment_refund',
              success: true
            });
          } else {
            const errorMessage = refundResponse.error || refundResponse.data?.error || 'Payment refund failed';
            
            this.logger.error('Payment refund compensation failed', undefined, {
              correlationId: this.getCorrelationId(context),
              transactionId: context.payment.transactionId,
              error: errorMessage
            });

            compensationResults.push({
              action: 'payment_refund',
              success: false,
              error: errorMessage
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during payment refund';
          
          this.logger.error('Payment refund compensation threw exception', error as Error, {
            correlationId: this.getCorrelationId(context),
            transactionId: context.payment.transactionId
          });

          compensationResults.push({
            action: 'payment_refund',
            success: false,
            error: errorMessage
          });
        }
      } else {
        this.logger.info('No payment to refund in order confirmation compensation', {
          correlationId: this.getCorrelationId(context)
        });

        compensationResults.push({
          action: 'payment_refund',
          success: true // No action needed
        });
      }

      // Step 2: Release stock reservations if they exist
      if (context.stockReservation && context.stockReservation.reservedItems) {
        this.logger.info('Compensating stock reservations as part of order confirmation failure', {
          correlationId: this.getCorrelationId(context),
          reservationId: context.stockReservation.reservationId,
          reservedItemsCount: context.stockReservation.reservedItems.length
        });

        const stockCompensationResult = await this.compensateStockReservations(context);
        compensationResults.push({
          action: 'stock_release',
          success: stockCompensationResult.success,
          error: stockCompensationResult.error
        });
      } else {
        this.logger.info('No stock reservations to release in order confirmation compensation', {
          correlationId: this.getCorrelationId(context)
        });

        compensationResults.push({
          action: 'stock_release',
          success: true // No action needed
        });
      }

      // Evaluate overall compensation success
      const failedCompensations = compensationResults.filter(result => !result.success);
      
      if (failedCompensations.length === 0) {
        this.logger.info('Order confirmation compensation completed successfully', {
          correlationId: this.getCorrelationId(context),
          compensationActions: compensationResults.map(r => r.action)
        });

        return {
          success: true
        };
      } else {
        const errorDetails = failedCompensations
          .map(failure => `${failure.action}: ${failure.error}`)
          .join('; ');

        this.logger.error('Order confirmation compensation partially failed', undefined, {
          correlationId: this.getCorrelationId(context),
          failedActions: failedCompensations.map(f => f.action),
          errors: errorDetails
        });

        return {
          success: false,
          error: `Partial compensation failure: ${errorDetails}`
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during order confirmation compensation';
      
      this.logger.error('Order confirmation compensation failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context)
      });

      return {
        success: false,
        error: `Order confirmation compensation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Order confirmation supports compensation (full compensation chain)
   */
  public canCompensate(): boolean {
    return true;
  }

  /**
   * Get the next state after successful order confirmation
   */
  public getNextState(context: SagaContext): SagaState {
    return SagaState.SALE_CONFIRMED;
  }

  /**
   * Get the failure state when order confirmation fails
   */
  public getFailureState(context: SagaContext): SagaState {
    return SagaState.ORDER_CONFIRMATION_FAILED;
  }

  /**
   * Validate context specific to order confirmation
   */
  protected validateContext(context: SagaContext): void {
    super.validateContext(context);

    // Validate that payment processing was completed
    if (!context.payment) {
      throw new Error('Payment context is required for order confirmation');
    }

    if (!context.payment.transactionId) {
      throw new Error('Order confirmation cannot proceed without successful payment processing');
    }

    if (!context.payment.amount || context.payment.amount <= 0) {
      throw new Error(`Invalid payment amount: ${context.payment.amount}`);
    }

    // Validate that stock reservation was completed
    if (!context.stockReservation) {
      throw new Error('Stock reservation context is required for order confirmation');
    }

    if (!context.stockReservation.reservationId) {
      throw new Error('Order confirmation cannot proceed without successful stock reservation');
    }

    if (!context.stockReservation.reservedItems || context.stockReservation.reservedItems.length === 0) {
      throw new Error('No reserved items found for order confirmation');
    }

    // Validate that stock verification was completed
    if (!context.stockVerification || !context.stockVerification.verified) {
      throw new Error('Order confirmation cannot proceed without successful stock verification');
    }

    // Validate consistency between payment amount and sale total
    const calculatedTotal = this.calculateTotalAmount(context);
    if (Math.abs(context.payment.amount - calculatedTotal) > 0.01) { // Allow for small rounding differences
      throw new Error(`Payment amount (${context.payment.amount}) does not match calculated total (${calculatedTotal})`);
    }

    // Validate that reserved items match sale request items
    const saleItemsMap = new Map(
      context.saleRequest.lines.map(line => [line.productId, line.quantity])
    );

    for (const reservedItem of context.stockReservation.reservedItems) {
      const saleQuantity = saleItemsMap.get(reservedItem.productId);
      if (saleQuantity === undefined) {
        throw new Error(`Reserved item ${reservedItem.productId} not found in sale request`);
      }

      if (reservedItem.quantity !== saleQuantity) {
        throw new Error(`Reserved quantity (${reservedItem.quantity}) does not match sale quantity (${saleQuantity}) for product ${reservedItem.productId}`);
      }
    }
  }

  /**
   * Helper method to compensate stock reservations
   */
  private async compensateStockReservations(context: SagaContext): Promise<CompensationResult> {
    if (!context.stockReservation || !context.stockReservation.reservedItems) {
      return { success: true };
    }

    let allReleasesSuccessful = true;
    const releaseErrors: string[] = [];

    for (const reservedItem of context.stockReservation.reservedItems) {
      try {
        // Generate reservation ID for release (in a real implementation, this would be stored)
        const reservationId = (reservedItem as any).individualReservationId || 
          `res-${context.saleRequest.storeId}-${reservedItem.productId}-${Date.now()}`;

        this.logger.info('Releasing stock reservation for item in order confirmation compensation', {
          correlationId: this.getCorrelationId(context),
          productId: reservedItem.productId,
          quantity: reservedItem.quantity,
          reservationId
        });

        const releaseResponse = await this.catalogServiceClient.releaseReservation(reservationId);

        if (!releaseResponse.success || !releaseResponse.data?.success) {
          const errorMessage = releaseResponse.error || releaseResponse.data?.error || 'Stock release failed';
          
          this.logger.error('Failed to release stock reservation in order confirmation compensation', undefined, {
            correlationId: this.getCorrelationId(context),
            productId: reservedItem.productId,
            reservationId,
            error: errorMessage
          });

          allReleasesSuccessful = false;
          releaseErrors.push(`Product ${reservedItem.productId}: ${errorMessage}`);
        } else {
          this.logger.info('Stock reservation released successfully in order confirmation compensation', {
            correlationId: this.getCorrelationId(context),
            productId: reservedItem.productId,
            reservationId
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        this.logger.error('Exception while releasing stock reservation in order confirmation compensation', error as Error, {
          correlationId: this.getCorrelationId(context),
          productId: reservedItem.productId
        });

        allReleasesSuccessful = false;
        releaseErrors.push(`Product ${reservedItem.productId}: ${errorMessage}`);
      }
    }

    if (allReleasesSuccessful) {
      return { success: true };
    } else {
      return {
        success: false,
        error: `Stock release failures: ${releaseErrors.join('; ')}`
      };
    }
  }
}