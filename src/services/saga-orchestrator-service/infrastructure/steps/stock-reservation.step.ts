/**
 * Stock Reservation Step
 * 
 * Reserves stock for all items in the sale request after successful verification.
 * This step supports compensation by releasing reserved stock if the saga fails
 * in later steps.
 */

import { BaseSagaStep } from '../../application/steps/base-saga-step';
import { StepResult, CompensationResult } from '../../application/interfaces/saga-step.interface';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { CatalogServiceClient, StockReservationRequest } from '../services/catalog-service.client';

/**
 * Step to reserve stock for all items in the sale request
 */
export class StockReservationStep extends BaseSagaStep {
  constructor(private readonly catalogServiceClient: CatalogServiceClient) {
    super('Stock Reservation');
  }

  /**
   * Execute stock reservation for all items in the sale request
   */
  protected async executeStep(context: SagaContext): Promise<StepResult> {
    this.logger.info('Starting stock reservation', {
      correlationId: this.getCorrelationId(context),
      userId: context.saleRequest.userId,
      storeId: context.saleRequest.storeId,
      itemCount: context.saleRequest.lines.length,
      totalAmount: this.formatCurrency(this.calculateTotalAmount(context))
    });

    try {
      // Validate that stock verification was completed successfully
      if (!context.stockVerification || !context.stockVerification.verified) {
        throw new Error('Stock reservation cannot proceed without successful stock verification');
      }

      const reservedItems: Array<{ productId: number; quantity: number; reservationId: string }> = [];
      const failedReservations: Array<{ productId: number; error: string }> = [];

      // Reserve stock for each item
      for (const line of context.saleRequest.lines) {
        this.logger.info('Reserving stock for item', {
          correlationId: this.getCorrelationId(context),
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice
        });

        const reservationRequest: StockReservationRequest = {
          storeId: context.saleRequest.storeId,
          productId: line.productId,
          quantity: line.quantity
        };

        try {
          const reservationResponse = await this.catalogServiceClient.reserveStock(reservationRequest);

          if (!reservationResponse.success) {
            this.logger.error('Stock reservation service call failed', undefined, {
              correlationId: this.getCorrelationId(context),
              productId: line.productId,
              error: reservationResponse.error
            });

            failedReservations.push({
              productId: line.productId,
              error: reservationResponse.error || 'Service call failed'
            });
            break; // Stop processing on first failure
          }

          const reservationData = reservationResponse.data!;

          if (reservationData.success && reservationData.reservationId) {
            // Reservation successful
            reservedItems.push({
              productId: line.productId,
              quantity: line.quantity,
              reservationId: reservationData.reservationId
            });

            this.logger.info('Stock reserved successfully for item', {
              correlationId: this.getCorrelationId(context),
              productId: line.productId,
              quantity: line.quantity,
              reservationId: reservationData.reservationId
            });
          } else {
            // Reservation failed
            const errorMessage = reservationData.error || 'Stock reservation failed';
            
            this.logger.warn('Stock reservation failed for item', {
              correlationId: this.getCorrelationId(context),
              productId: line.productId,
              quantity: line.quantity,
              error: errorMessage
            });

            failedReservations.push({
              productId: line.productId,
              error: errorMessage
            });
            break; // Stop processing on first failure
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          this.logger.error('Exception during stock reservation for item', error as Error, {
            correlationId: this.getCorrelationId(context),
            productId: line.productId,
            quantity: line.quantity
          });

          failedReservations.push({
            productId: line.productId,
            error: errorMessage
          });
          break; // Stop processing on first failure
        }
      }

      // Check if all reservations were successful
      if (failedReservations.length > 0) {
        // Some reservations failed - need to release any successful ones
        if (reservedItems.length > 0) {
          this.logger.warn('Rolling back successful reservations due to failures', {
            correlationId: this.getCorrelationId(context),
            successfulReservations: reservedItems.length,
            failedReservations: failedReservations.length
          });

          // Attempt to release successful reservations
          await this.releaseReservations(context, reservedItems);
        }

        const errorDetails = failedReservations
          .map(failure => `Product ${failure.productId}: ${failure.error}`)
          .join('; ');

        return {
          success: false,
          error: `Stock reservation failed for ${failedReservations.length} item(s): ${errorDetails}`,
          nextState: this.getFailureState(context)
        };
      }

      // All reservations successful
      this.logger.info('Stock reservation completed successfully for all items', {
        correlationId: this.getCorrelationId(context),
        reservedItemsCount: reservedItems.length,
        totalReservedItems: reservedItems.reduce((sum, item) => sum + item.quantity, 0)
      });

      // Generate a master reservation ID for tracking
      const masterReservationId = `master-${context.saleRequest.storeId}-${Date.now()}`;

      // Update saga context with reservation results
      const contextUpdate = {
        stockReservation: {
          reservationId: masterReservationId,
          reservedItems: reservedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            individualReservationId: item.reservationId
          }))
        }
      };

      return {
        success: true,
        data: contextUpdate,
        nextState: this.getNextState(context)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during stock reservation';
      
      this.logger.error('Stock reservation step failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context)
      });

      return {
        success: false,
        error: `Stock reservation failed: ${errorMessage}`,
        nextState: this.getFailureState(context)
      };
    }
  }

  /**
   * Compensate by releasing all reserved stock
   */
  protected async compensateStep(context: SagaContext): Promise<CompensationResult> {
    this.logger.info('Starting stock reservation compensation', {
      correlationId: this.getCorrelationId(context)
    });

    try {
      if (!context.stockReservation || !context.stockReservation.reservedItems) {
        this.logger.info('No stock reservations to compensate', {
          correlationId: this.getCorrelationId(context)
        });

        return {
          success: true
        };
      }

      const reservedItems = context.stockReservation.reservedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        reservationId: (item as any).individualReservationId || `res-${context.saleRequest.storeId}-${item.productId}-${Date.now()}`
      }));

      const compensationResult = await this.releaseReservations(context, reservedItems);

      if (compensationResult) {
        this.logger.info('Stock reservation compensation completed successfully', {
          correlationId: this.getCorrelationId(context),
          releasedItemsCount: reservedItems.length
        });

        return {
          success: true
        };
      } else {
        this.logger.error('Stock reservation compensation failed', undefined, {
          correlationId: this.getCorrelationId(context)
        });

        return {
          success: false,
          error: 'Failed to release some or all reserved stock'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during compensation';
      
      this.logger.error('Stock reservation compensation failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context)
      });

      return {
        success: false,
        error: `Stock reservation compensation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Stock reservation supports compensation
   */
  public canCompensate(): boolean {
    return true;
  }

  /**
   * Get the next state after successful stock reservation
   */
  public getNextState(context: SagaContext): SagaState {
    return SagaState.STOCK_RESERVED;
  }

  /**
   * Get the failure state when stock reservation fails
   */
  public getFailureState(context: SagaContext): SagaState {
    return SagaState.STOCK_RESERVATION_FAILED;
  }

  /**
   * Validate context specific to stock reservation
   */
  protected validateContext(context: SagaContext): void {
    super.validateContext(context);

    // Validate that stock verification was completed
    if (!context.stockVerification) {
      throw new Error('Stock verification context is required for stock reservation');
    }

    if (!context.stockVerification.verified) {
      throw new Error('Stock reservation cannot proceed without successful stock verification');
    }

    // Validate that available quantities are present
    if (!context.stockVerification.availableQuantities) {
      throw new Error('Available quantities are required for stock reservation');
    }

    // Validate that we have sufficient stock for each item
    for (const line of context.saleRequest.lines) {
      const availableQuantity = context.stockVerification.availableQuantities[line.productId];
      
      if (availableQuantity === undefined) {
        throw new Error(`No availability information for product ${line.productId}`);
      }

      if (availableQuantity < line.quantity) {
        throw new Error(`Insufficient stock for product ${line.productId}: requested ${line.quantity}, available ${availableQuantity}`);
      }
    }
  }

  /**
   * Helper method to release multiple reservations
   */
  private async releaseReservations(
    context: SagaContext,
    reservedItems: Array<{ productId: number; quantity: number; reservationId: string }>
  ): Promise<boolean> {
    let allReleasesSuccessful = true;

    for (const item of reservedItems) {
      try {
        this.logger.info('Releasing stock reservation for item', {
          correlationId: this.getCorrelationId(context),
          productId: item.productId,
          quantity: item.quantity,
          reservationId: item.reservationId
        });

        const releaseResponse = await this.catalogServiceClient.releaseReservation(item.reservationId);

        if (!releaseResponse.success || !releaseResponse.data?.success) {
          this.logger.error('Failed to release stock reservation for item', undefined, {
            correlationId: this.getCorrelationId(context),
            productId: item.productId,
            reservationId: item.reservationId,
            error: releaseResponse.error || releaseResponse.data?.error
          });

          allReleasesSuccessful = false;
        } else {
          this.logger.info('Stock reservation released successfully for item', {
            correlationId: this.getCorrelationId(context),
            productId: item.productId,
            reservationId: item.reservationId
          });
        }
      } catch (error) {
        this.logger.error('Exception while releasing stock reservation for item', error as Error, {
          correlationId: this.getCorrelationId(context),
          productId: item.productId,
          reservationId: item.reservationId
        });

        allReleasesSuccessful = false;
      }
    }

    return allReleasesSuccessful;
  }
}