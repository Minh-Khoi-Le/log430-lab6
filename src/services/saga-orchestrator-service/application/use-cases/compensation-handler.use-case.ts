/**
 * Compensation Handler Use Case
 * 
 * Handles compensation orchestration for failed sagas.
 * Implements reverse-order compensation execution and
 * compensation failure handling with manual intervention flags.
 */

import { createLogger, Logger } from '@shared/infrastructure/logging';
import { Saga } from '../../domain/entities/saga.entity';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { ISagaRepository } from '../../domain/repositories/saga.repository';
import { ISagaStep, CompensationResult } from '../interfaces/saga-step.interface';

/**
 * Compensation execution result
 */
export interface CompensationExecutionResult {
  success: boolean;
  compensatedSteps: string[];
  failedCompensations: Array<{
    stepName: string;
    error: string;
  }>;
  requiresManualIntervention: boolean;
  finalState: SagaState;
}

/**
 * Compensation handler for failed sagas
 */
export class CompensationHandler {
  private readonly logger: Logger;

  constructor(private readonly sagaRepository: ISagaRepository) {
    this.logger = createLogger('compensation-handler');
  }

  /**
   * Execute compensation for a failed saga
   * @param saga Failed saga instance
   * @param steps All saga steps (for reverse-order compensation)
   * @returns Promise resolving to compensation execution result
   */
  async executeCompensation(
    saga: Saga, 
    steps: ISagaStep[]
  ): Promise<CompensationExecutionResult> {
    this.logger.info('Starting compensation execution', {
      correlationId: saga.correlationId,
      currentState: saga.state,
      totalSteps: steps.length
    });

    const result: CompensationExecutionResult = {
      success: true,
      compensatedSteps: [],
      failedCompensations: [],
      requiresManualIntervention: false,
      finalState: SagaState.COMPENSATED
    };

    try {
      // Determine which steps need compensation based on saga state
      const stepsToCompensate = this.getStepsToCompensate(saga, steps);

      if (stepsToCompensate.length === 0) {
        this.logger.info('No steps require compensation', {
          correlationId: saga.correlationId,
          currentState: saga.state
        });
        
        return result;
      }

      this.logger.info('Identified steps for compensation', {
        correlationId: saga.correlationId,
        stepsToCompensate: stepsToCompensate.map(s => s.name)
      });

      // Execute compensation in reverse order
      for (const step of stepsToCompensate) {
        const compensationResult = await this.compensateStep(saga, step);
        
        if (compensationResult.success) {
          result.compensatedSteps.push(step.name);
          saga.markCompensationActionCompleted(step.name);
          
          this.logger.info('Step compensation successful', {
            correlationId: saga.correlationId,
            stepName: step.name
          });
        } else {
          result.success = false;
          result.failedCompensations.push({
            stepName: step.name,
            error: compensationResult.error || 'Unknown compensation error'
          });

          this.logger.error('Step compensation failed', undefined, {
            correlationId: saga.correlationId,
            stepName: step.name,
            error: compensationResult.error
          });

          // Continue with other compensations even if one fails
        }
      }

      // Determine final state and manual intervention requirement
      if (result.failedCompensations.length > 0) {
        result.requiresManualIntervention = true;
        result.finalState = SagaState.FAILED;
        
        // Update saga with compensation failure information
        saga.setCompensationData({
          compensatedSteps: result.compensatedSteps,
          failedCompensations: result.failedCompensations,
          requiresManualIntervention: true,
          compensationAttemptedAt: new Date().toISOString()
        });

        this.logger.warn('Compensation completed with failures - manual intervention required', {
          correlationId: saga.correlationId,
          compensatedSteps: result.compensatedSteps.length,
          failedCompensations: result.failedCompensations.length
        });
      } else {
        // All compensations successful
        saga.setCompensationData({
          compensatedSteps: result.compensatedSteps,
          failedCompensations: [],
          requiresManualIntervention: false,
          compensationCompletedAt: new Date().toISOString()
        });

        this.logger.info('All compensations completed successfully', {
          correlationId: saga.correlationId,
          compensatedSteps: result.compensatedSteps.length
        });
      }

      // Update saga state and persist
      saga.updateState(result.finalState);
      saga.complete();
      await this.sagaRepository.update(saga.id, saga);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Compensation execution failed with exception', error as Error, {
        correlationId: saga.correlationId
      });

      // Mark saga as failed with compensation error
      saga.updateState(SagaState.FAILED);
      saga.setError(`Compensation failed: ${errorMessage}`);
      saga.setCompensationData({
        compensatedSteps: result.compensatedSteps,
        failedCompensations: result.failedCompensations,
        requiresManualIntervention: true,
        compensationError: errorMessage,
        compensationFailedAt: new Date().toISOString()
      });
      saga.complete();
      await this.sagaRepository.update(saga.id, saga);

      return {
        success: false,
        compensatedSteps: result.compensatedSteps,
        failedCompensations: result.failedCompensations,
        requiresManualIntervention: true,
        finalState: SagaState.FAILED
      };
    }
  }

  /**
   * Compensate a single step
   * @param saga Saga instance
   * @param step Step to compensate
   * @returns Promise resolving to compensation result
   */
  private async compensateStep(saga: Saga, step: ISagaStep): Promise<CompensationResult> {
    const startTime = Date.now();

    this.logger.info('Starting step compensation', {
      correlationId: saga.correlationId,
      stepName: step.name,
      canCompensate: step.canCompensate()
    });

    try {
      if (!step.canCompensate()) {
        this.logger.info('Step does not support compensation', {
          correlationId: saga.correlationId,
          stepName: step.name
        });
        
        return { success: true }; // No compensation needed
      }

      // Add compensation action to saga context for tracking
      saga.addCompensationAction(step.name, {
        startedAt: new Date().toISOString(),
        stepName: step.name
      });

      // Execute compensation
      const result = await step.compensate(saga.context);
      
      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.info('Step compensation completed successfully', {
          correlationId: saga.correlationId,
          stepName: step.name,
          duration
        });
      } else {
        this.logger.error('Step compensation failed', undefined, {
          correlationId: saga.correlationId,
          stepName: step.name,
          duration,
          error: result.error
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Step compensation threw exception', error as Error, {
        correlationId: saga.correlationId,
        stepName: step.name,
        duration
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Determine which steps need compensation based on saga state
   * @param saga Saga instance
   * @param allSteps All available saga steps
   * @returns Array of steps that need compensation in reverse order
   */
  private getStepsToCompensate(saga: Saga, allSteps: ISagaStep[]): ISagaStep[] {
    const stepsToCompensate: ISagaStep[] = [];

    switch (saga.state) {
      case SagaState.PAYMENT_FAILED:
        // Only need to compensate stock reservation
        const stockReservationStep = allSteps.find(s => s.name === 'Stock Reservation');
        if (stockReservationStep && stockReservationStep.canCompensate()) {
          stepsToCompensate.push(stockReservationStep);
        }
        break;

      case SagaState.ORDER_CONFIRMATION_FAILED:
        // Need to compensate payment and stock reservation (in reverse order)
        const paymentStep = allSteps.find(s => s.name === 'Payment Processing');
        const stockStep = allSteps.find(s => s.name === 'Stock Reservation');
        
        if (paymentStep && paymentStep.canCompensate()) {
          stepsToCompensate.push(paymentStep);
        }
        if (stockStep && stockStep.canCompensate()) {
          stepsToCompensate.push(stockStep);
        }
        break;

      default:
        this.logger.warn('No compensation pattern defined for saga state', {
          correlationId: saga.correlationId,
          state: saga.state
        });
        break;
    }

    return stepsToCompensate;
  }

  /**
   * Check if a saga requires manual intervention
   * @param saga Saga instance
   * @returns True if manual intervention is required
   */
  isManualInterventionRequired(saga: Saga): boolean {
    if (!saga.compensationData) {
      return false;
    }

    return saga.compensationData.requiresManualIntervention === true;
  }

  /**
   * Get compensation summary for monitoring/reporting
   * @param saga Saga instance
   * @returns Compensation summary or null if no compensation data
   */
  getCompensationSummary(saga: Saga): {
    compensatedSteps: string[];
    failedCompensations: Array<{ stepName: string; error: string }>;
    requiresManualIntervention: boolean;
    compensationCompletedAt?: string;
    compensationFailedAt?: string;
  } | null {
    if (!saga.compensationData) {
      return null;
    }

    return {
      compensatedSteps: saga.compensationData.compensatedSteps || [],
      failedCompensations: saga.compensationData.failedCompensations || [],
      requiresManualIntervention: saga.compensationData.requiresManualIntervention || false,
      compensationCompletedAt: saga.compensationData.compensationCompletedAt,
      compensationFailedAt: saga.compensationData.compensationFailedAt
    };
  }
}