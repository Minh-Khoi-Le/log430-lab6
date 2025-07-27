/**
 * Stock Verification Step
 * 
 * Verifies stock availability for all items in the sale request.
 * This is the first step in the saga workflow and does not require compensation
 * since no resources are allocated during verification.
 */

import { BaseSagaStep } from '../../application/steps/base-saga-step';
import { StepResult, CompensationResult } from '../../application/interfaces/saga-step.interface';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { CatalogServiceClient, StockVerificationRequest } from '../services/catalog-service.client';

/**
 * Step to verify stock availability for all items in the sale request
 */
export class StockVerificationStep extends BaseSagaStep {
  constructor(private readonly catalogServiceClient: CatalogServiceClient) {
    super('Stock Verification');
  }

  /**
   * Execute stock verification for all items in the sale request
   */
  protected async executeStep(context: SagaContext): Promise<StepResult> {
    this.logger.info('Starting stock verification', {
      correlationId: this.getCorrelationId(context),
      userId: context.saleRequest.userId,
      storeId: context.saleRequest.storeId,
      itemCount: context.saleRequest.lines.length,
      totalAmount: this.formatCurrency(this.calculateTotalAmount(context))
    });

    try {
      // Prepare stock verification request
      const verificationRequest: StockVerificationRequest = {
        items: context.saleRequest.lines.map(line => ({
          storeId: context.saleRequest.storeId,
          productId: line.productId,
          quantity: line.quantity
        }))
      };

      // Call catalog service to verify stock
      const verificationResponse = await this.catalogServiceClient.verifyStock(verificationRequest);

      if (!verificationResponse.success) {
        this.logger.error('Stock verification service call failed', undefined, {
          correlationId: this.getCorrelationId(context),
          error: verificationResponse.error
        });

        return {
          success: false,
          error: `Stock verification failed: ${verificationResponse.error}`,
          nextState: this.getFailureState(context)
        };
      }

      const verificationData = verificationResponse.data!;

      if (verificationData.verified) {
        // Stock is available for all items
        this.logger.info('Stock verification successful - all items available', {
          correlationId: this.getCorrelationId(context),
          availableQuantities: verificationData.availableQuantities
        });

        // Update saga context with verification results
        const contextUpdate = {
          stockVerification: {
            verified: true,
            availableQuantities: verificationData.availableQuantities
          }
        };

        return {
          success: true,
          data: contextUpdate,
          nextState: this.getNextState(context)
        };
      } else {
        // Insufficient stock for one or more items
        const insufficientItems = verificationData.insufficientItems || [];
        
        this.logger.warn('Stock verification failed - insufficient stock', {
          correlationId: this.getCorrelationId(context),
          insufficientItemsCount: insufficientItems.length,
          insufficientItems: insufficientItems.map(item => ({
            productId: item.productId,
            requested: item.requested,
            available: item.available,
            shortfall: item.requested - item.available
          }))
        });

        // Create detailed error message
        const errorDetails = insufficientItems
          .map(item => `Product ${item.productId}: requested ${item.requested}, available ${item.available}`)
          .join('; ');

        // Update saga context with verification results (even though it failed)
        const contextUpdate = {
          stockVerification: {
            verified: false,
            availableQuantities: verificationData.availableQuantities
          }
        };

        return {
          success: false,
          error: `Insufficient stock for ${insufficientItems.length} item(s): ${errorDetails}`,
          data: contextUpdate,
          nextState: this.getFailureState(context)
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during stock verification';
      
      this.logger.error('Stock verification step failed with exception', error as Error, {
        correlationId: this.getCorrelationId(context)
      });

      return {
        success: false,
        error: `Stock verification failed: ${errorMessage}`,
        nextState: this.getFailureState(context)
      };
    }
  }

  /**
   * Stock verification does not require compensation since no resources are allocated
   */
  protected async compensateStep(context: SagaContext): Promise<CompensationResult> {
    this.logger.info('Stock verification compensation called (no action required)', {
      correlationId: this.getCorrelationId(context)
    });

    return {
      success: true
    };
  }

  /**
   * Stock verification does not support compensation since no resources are allocated
   */
  public canCompensate(): boolean {
    return false;
  }

  /**
   * Get the next state after successful stock verification
   */
  public getNextState(context: SagaContext): SagaState {
    return SagaState.STOCK_VERIFIED;
  }

  /**
   * Get the failure state when stock verification fails
   */
  public getFailureState(context: SagaContext): SagaState {
    return SagaState.STOCK_VERIFICATION_FAILED;
  }

  /**
   * Validate context specific to stock verification
   */
  protected validateContext(context: SagaContext): void {
    super.validateContext(context);

    // Validate that all line items have valid product IDs and quantities
    for (const line of context.saleRequest.lines) {
      if (!line.productId || line.productId <= 0) {
        throw new Error(`Invalid product ID: ${line.productId}`);
      }

      if (!line.quantity || line.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${line.productId}: ${line.quantity}`);
      }

      if (!line.unitPrice || line.unitPrice < 0) {
        throw new Error(`Invalid unit price for product ${line.productId}: ${line.unitPrice}`);
      }
    }

    // Validate store ID
    if (!context.saleRequest.storeId || context.saleRequest.storeId <= 0) {
      throw new Error(`Invalid store ID: ${context.saleRequest.storeId}`);
    }
  }
}