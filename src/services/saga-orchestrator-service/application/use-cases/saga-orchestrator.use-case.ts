/**
 * Saga Orchestrator Use Case
 * 
 * Main orchestration logic for sale creation workflow.
 * Implements step execution with proper state transitions,
 * comprehensive error handling and logging.
 */


import { createLogger, Logger } from '@shared/infrastructure/logging';
import { Saga } from '../../domain/entities/saga.entity';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { ISagaRepository } from '../../domain/repositories/saga.repository';
import { ISagaStep, StepResult } from '../interfaces/saga-step.interface';
import { 
  StockVerificationStep,
  StockReservationStep,
  PaymentProcessingStep,
  OrderConfirmationStep
} from '../../infrastructure/steps';
import { ServiceClientFactory } from '../../infrastructure/services';
import { CompensationHandler } from './compensation-handler.use-case';
import { SagaStateManager } from './saga-state-manager.use-case';

/**
 * Sale creation request interface
 */
export interface SaleCreationRequest {
  userId: number;
  storeId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Saga orchestration result
 */
export interface SagaOrchestrationResult {
  success: boolean;
  correlationId: string;
  sagaState: SagaState;
  saleId?: number;
  totalAmount?: number;
  error?: string;
  duration?: number;
}

/**
 * Main saga orchestrator use case
 */
export class SagaOrchestratorUseCase {
  private readonly logger: Logger;
  private readonly steps: ISagaStep[];
  private readonly compensationHandler: CompensationHandler;
  private readonly stateManager: SagaStateManager;

  constructor(
    private readonly sagaRepository: ISagaRepository,
    private readonly serviceClientFactory: ServiceClientFactory
  ) {
    this.logger = createLogger('saga-orchestrator-use-case');
    this.compensationHandler = new CompensationHandler(this.sagaRepository);
    this.stateManager = new SagaStateManager(this.sagaRepository);
    
    // Initialize saga steps in execution order
    this.steps = [
      new StockVerificationStep(this.serviceClientFactory.createCatalogServiceClient()),
      new StockReservationStep(this.serviceClientFactory.createCatalogServiceClient()),
      new PaymentProcessingStep(this.serviceClientFactory.createTransactionServiceClient()),
      new OrderConfirmationStep(
        this.serviceClientFactory.createTransactionServiceClient(),
        this.serviceClientFactory.createCatalogServiceClient()
      )
    ];
  }

  /**
   * Create a new sale using the saga orchestration pattern
   * @param request Sale creation request
   * @returns Promise resolving to saga orchestration result
   */
  async createSale(request: SaleCreationRequest): Promise<SagaOrchestrationResult> {
    const correlationId = this.stateManager.generateCorrelationId();
    const startTime = Date.now();

    this.logger.info('Starting saga orchestration for sale creation', {
      correlationId,
      userId: request.userId,
      storeId: request.storeId,
      itemCount: request.lines.length,
      totalAmount: this.calculateTotalAmount(request.lines)
    });

    try {
      // Validate the sale creation request
      this.validateSaleRequest(request);

      // Create initial saga context
      const sagaContext: SagaContext = {
        saleRequest: request
      };

      // Create and persist initial saga using state manager
      const saga = await this.stateManager.createSaga(sagaContext, correlationId);

      // Execute the saga workflow
      const result = await this.executeSagaWorkflow(saga);

      const duration = Date.now() - startTime;
      
      this.logger.info('Saga orchestration completed', {
        correlationId,
        finalState: result.sagaState,
        success: result.success,
        duration
      });

      return {
        ...result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Saga orchestration failed with exception', error as Error, {
        correlationId,
        duration
      });

      return {
        success: false,
        correlationId,
        sagaState: SagaState.FAILED,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Get saga status by correlation ID
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to saga orchestration result
   */
  async getSagaStatus(correlationId: string): Promise<SagaOrchestrationResult | null> {
    try {
      this.logger.info('Getting saga status', { correlationId });

      const saga = await this.stateManager.getSagaByCorrelationId(correlationId);
      
      if (!saga) {
        this.logger.warn('Saga not found', { correlationId });
        return null;
      }

      const result: SagaOrchestrationResult = {
        success: saga.isSuccessful(),
        correlationId: saga.correlationId,
        sagaState: saga.state,
        error: saga.errorMessage || undefined,
        duration: saga.getDuration() || undefined
      };

      // Add sale result if available
      if (saga.context.saleResult) {
        result.saleId = saga.context.saleResult.saleId;
        result.totalAmount = saga.context.saleResult.total;
      }

      // Add compensation information if available
      const compensationSummary = this.compensationHandler.getCompensationSummary(saga);
      if (compensationSummary) {
        (result as any).compensation = compensationSummary;
      }

      this.logger.info('Retrieved saga status', {
        correlationId,
        state: saga.state,
        isCompleted: saga.isCompleted(),
        hasCompensation: !!compensationSummary
      });

      return result;

    } catch (error) {
      this.logger.error('Error getting saga status', error as Error, { correlationId });
      throw error;
    }
  }

  /**
   * Execute the complete saga workflow
   * @param saga Initial saga instance
   * @returns Promise resolving to saga orchestration result
   */
  private async executeSagaWorkflow(saga: Saga): Promise<SagaOrchestrationResult> {
    let currentSaga = saga;

    try {
      // Execute each step in sequence
      for (const step of this.steps) {
        this.logger.info('Executing saga step', {
          correlationId: currentSaga.correlationId,
          stepName: step.name,
          currentState: currentSaga.state
        });

        // Update saga state to indicate step is starting
        const processingState = this.getProcessingState(step.name);
        if (processingState) {
          currentSaga = await this.stateManager.updateSagaState(
            currentSaga, 
            processingState, 
            step.name
          );
        }

        // Execute the step
        const stepResult = await step.execute(currentSaga.context);

        // Update saga with step result using state manager
        currentSaga = await this.handleStepResult(currentSaga, step, stepResult);

        // If step failed, handle failure and exit workflow
        if (!stepResult.success) {
          return await this.handleStepFailure(currentSaga, step, stepResult);
        }

        // If this was the final step and successful, complete the saga
        if (step === this.steps[this.steps.length - 1] && stepResult.success) {
          currentSaga = await this.stateManager.completeSaga(
            currentSaga,
            currentSaga.state
          );

          this.logger.info('Saga workflow completed successfully', {
            correlationId: currentSaga.correlationId,
            finalState: currentSaga.state
          });

          return {
            success: true,
            correlationId: currentSaga.correlationId,
            sagaState: currentSaga.state,
            saleId: currentSaga.context.saleResult?.saleId,
            totalAmount: currentSaga.context.saleResult?.total
          };
        }
      }

      // This should not happen if workflow is properly configured
      throw new Error('Saga workflow completed without reaching final step');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Saga workflow execution failed', error as Error, {
        correlationId: currentSaga.correlationId,
        currentState: currentSaga.state
      });

      // Complete saga with error using state manager
      currentSaga = await this.stateManager.completeSaga(
        currentSaga,
        SagaState.FAILED,
        errorMessage
      );

      return {
        success: false,
        correlationId: currentSaga.correlationId,
        sagaState: SagaState.FAILED,
        error: errorMessage
      };
    }
  }

  /**
   * Handle the result of a step execution
   * @param saga Current saga instance
   * @param step Executed step
   * @param stepResult Step execution result
   * @returns Promise resolving to updated saga
   */
  private async handleStepResult(
    saga: Saga, 
    step: ISagaStep, 
    stepResult: StepResult
  ): Promise<Saga> {
    // Set error message if step failed
    if (!stepResult.success && stepResult.error) {
      saga.setError(stepResult.error);
    }

    // Update saga state and context using state manager
    const updatedSaga = await this.stateManager.updateSagaState(
      saga,
      stepResult.nextState,
      stepResult.success ? undefined : step.name,
      stepResult.data
    );

    this.logger.info('Step result processed', {
      correlationId: saga.correlationId,
      stepName: step.name,
      success: stepResult.success,
      nextState: stepResult.nextState,
      error: stepResult.error
    });

    return updatedSaga;
  }

  /**
   * Handle step failure and determine if compensation is needed
   * @param saga Current saga instance
   * @param failedStep Failed step
   * @param stepResult Step failure result
   * @returns Promise resolving to saga orchestration result
   */
  private async handleStepFailure(
    saga: Saga,
    failedStep: ISagaStep,
    stepResult: StepResult
  ): Promise<SagaOrchestrationResult> {
    this.logger.warn('Step failed, checking if compensation is needed', {
      correlationId: saga.correlationId,
      failedStep: failedStep.name,
      failureState: stepResult.nextState,
      error: stepResult.error
    });

    // Check if saga can be compensated
    if (saga.canCompensate()) {
      this.logger.info('Starting compensation workflow', {
        correlationId: saga.correlationId,
        failedStep: failedStep.name
      });

      try {
        // Execute compensation using the compensation handler
        const compensationResult = await this.compensationHandler.executeCompensation(saga, this.steps);

        if (compensationResult.success) {
          this.logger.info('Compensation completed successfully', {
            correlationId: saga.correlationId,
            compensatedSteps: compensationResult.compensatedSteps,
            finalState: compensationResult.finalState
          });

          return {
            success: false,
            correlationId: saga.correlationId,
            sagaState: compensationResult.finalState,
            error: `${stepResult.error} (compensated: ${compensationResult.compensatedSteps.join(', ')})`
          };
        } else {
          this.logger.error('Compensation failed', undefined, {
            correlationId: saga.correlationId,
            compensatedSteps: compensationResult.compensatedSteps,
            failedCompensations: compensationResult.failedCompensations,
            requiresManualIntervention: compensationResult.requiresManualIntervention
          });

          const errorMessage = compensationResult.requiresManualIntervention
            ? `${stepResult.error} (compensation failed - manual intervention required)`
            : `${stepResult.error} (compensation failed)`;

          return {
            success: false,
            correlationId: saga.correlationId,
            sagaState: compensationResult.finalState,
            error: errorMessage
          };
        }
      } catch (compensationError) {
        const compensationErrorMessage = compensationError instanceof Error 
          ? compensationError.message 
          : 'Unknown compensation error';

        this.logger.error('Compensation execution threw exception', compensationError as Error, {
          correlationId: saga.correlationId,
          failedStep: failedStep.name
        });

        // Complete saga with compensation error using state manager
        await this.stateManager.completeSaga(
          saga,
          SagaState.FAILED,
          `${stepResult.error} (compensation error: ${compensationErrorMessage})`
        );

        return {
          success: false,
          correlationId: saga.correlationId,
          sagaState: SagaState.FAILED,
          error: `${stepResult.error} (compensation error: ${compensationErrorMessage})`
        };
      }
    } else {
      // No compensation needed, complete saga as failed using state manager
      const completedSaga = await this.stateManager.completeSaga(
        saga,
        saga.state,
        stepResult.error
      );

      this.logger.info('Saga failed without compensation', {
        correlationId: saga.correlationId,
        failedStep: failedStep.name,
        finalState: completedSaga.state
      });

      return {
        success: false,
        correlationId: saga.correlationId,
        sagaState: completedSaga.state,
        error: stepResult.error
      };
    }
  }



  /**
   * Get the processing state for a given step name
   * @param stepName Name of the step
   * @returns Processing state or null if no specific processing state
   */
  private getProcessingState(stepName: string): SagaState | null {
    switch (stepName) {
      case 'Stock Verification':
        return SagaState.STOCK_VERIFYING;
      case 'Stock Reservation':
        return SagaState.STOCK_RESERVING;
      case 'Payment Processing':
        return SagaState.PAYMENT_PROCESSING;
      case 'Order Confirmation':
        return SagaState.ORDER_CONFIRMING;
      default:
        return null;
    }
  }

  /**
   * Validate sale creation request
   * @param request Sale creation request to validate
   * @throws Error if request is invalid
   */
  private validateSaleRequest(request: SaleCreationRequest): void {
    if (!request) {
      throw new Error('Sale request is required');
    }

    if (!request.userId || request.userId <= 0) {
      throw new Error('Valid user ID is required');
    }

    if (!request.storeId || request.storeId <= 0) {
      throw new Error('Valid store ID is required');
    }

    if (!request.lines || request.lines.length === 0) {
      throw new Error('At least one line item is required');
    }

    // Validate each line item
    for (let i = 0; i < request.lines.length; i++) {
      const line = request.lines[i];
      
      if (!line.productId || line.productId <= 0) {
        throw new Error(`Invalid product ID in line ${i + 1}: ${line.productId}`);
      }

      if (!line.quantity || line.quantity <= 0) {
        throw new Error(`Invalid quantity in line ${i + 1}: ${line.quantity}`);
      }

      if (line.unitPrice === undefined || line.unitPrice < 0) {
        throw new Error(`Invalid unit price in line ${i + 1}: ${line.unitPrice}`);
      }
    }
  }

  /**
   * Check if a saga requires manual intervention
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to true if manual intervention is required
   */
  async requiresManualIntervention(correlationId: string): Promise<boolean> {
    try {
      const saga = await this.stateManager.getSagaByCorrelationId(correlationId);
      
      if (!saga) {
        this.logger.warn('Saga not found for manual intervention check', { correlationId });
        return false;
      }

      const requiresIntervention = this.compensationHandler.isManualInterventionRequired(saga);
      
      this.logger.info('Manual intervention check completed', {
        correlationId,
        requiresIntervention
      });

      return requiresIntervention;

    } catch (error) {
      this.logger.error('Error checking manual intervention requirement', error as Error, { 
        correlationId 
      });
      throw error;
    }
  }

  /**
   * Get sagas that require manual intervention
   * @param limit Maximum number of sagas to return
   * @returns Promise resolving to array of saga correlation IDs requiring intervention
   */
  async getSagasRequiringManualIntervention(limit: number = 50): Promise<string[]> {
    try {
      this.logger.info('Getting sagas requiring manual intervention', { limit });

      const failedSagas = await this.sagaRepository.findFailedSagas(limit);
      
      const sagasRequiringIntervention = failedSagas
        .filter(saga => this.compensationHandler.isManualInterventionRequired(saga))
        .map(saga => saga.correlationId);

      this.logger.info('Found sagas requiring manual intervention', {
        count: sagasRequiringIntervention.length,
        limit
      });

      return sagasRequiringIntervention;

    } catch (error) {
      this.logger.error('Error getting sagas requiring manual intervention', error as Error, { 
        limit 
      });
      throw error;
    }
  }

  /**
   * Get detailed saga metrics for monitoring and debugging
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to saga metrics or null if not found
   */
  async getSagaMetrics(correlationId: string): Promise<{
    correlationId: string;
    state: SagaState;
    duration: number | null;
    stepCount: number;
    isCompleted: boolean;
    isSuccessful: boolean;
    isFailed: boolean;
    totalAmount: number;
    totalItems: number;
  } | null> {
    try {
      return await this.stateManager.getSagaMetrics(correlationId);
    } catch (error) {
      this.logger.error('Error getting saga metrics', error as Error, { correlationId });
      throw error;
    }
  }

  /**
   * Get saga state history for debugging and monitoring
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to saga state history
   */
  async getSagaStateHistory(correlationId: string): Promise<any[]> {
    try {
      const saga = await this.stateManager.getSagaByCorrelationId(correlationId);
      
      if (!saga) {
        this.logger.warn('Saga not found for state history', { correlationId });
        return [];
      }

      const history = await this.stateManager.getSagaStateHistory(saga.id);
      
      this.logger.info('Retrieved saga state history', {
        correlationId,
        stepCount: history.length
      });

      return history;

    } catch (error) {
      this.logger.error('Error getting saga state history', error as Error, { correlationId });
      throw error;
    }
  }

  /**
   * Calculate total amount from line items
   * @param lines Sale line items
   * @returns Total amount
   */
  private calculateTotalAmount(lines: Array<{ quantity: number; unitPrice: number }>): number {
    return lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0);
  }
}