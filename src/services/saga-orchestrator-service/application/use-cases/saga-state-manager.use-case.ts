/**
 * Saga State Manager Use Case
 * 
 * Handles saga state management and persistence operations.
 * Implements state persistence after each step, correlation ID generation and tracking,
 * and saga context management and updates.
 */

import { randomUUID } from 'crypto';
import { createLogger, Logger } from '@shared/infrastructure/logging';
import { Saga } from '../../domain/entities/saga.entity';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { SagaStep, SagaStepState } from '../../domain/entities/saga-step.entity';
import { ISagaRepository } from '../../domain/repositories/saga.repository';

/**
 * State transition tracking information
 */
export interface StateTransitionInfo {
  fromState: SagaState;
  toState: SagaState;
  stepName?: string;
  timestamp: Date;
  duration?: number;
  success: boolean;
  error?: string;
}

/**
 * Context update information
 */
export interface ContextUpdateInfo {
  correlationId: string;
  updateType: string;
  updatedFields: string[];
  timestamp: Date;
}

/**
 * Saga state manager for handling state persistence and tracking
 */
export class SagaStateManager {
  private readonly logger: Logger;

  constructor(private readonly sagaRepository: ISagaRepository) {
    this.logger = createLogger('saga-state-manager');
  }

  /**
   * Generate a new correlation ID for saga tracking
   * @returns New correlation ID
   */
  generateCorrelationId(): string {
    const correlationId = randomUUID();
    
    this.logger.info('Generated new correlation ID', { correlationId });
    
    return correlationId;
  }

  /**
   * Create and persist a new saga with initial state
   * @param context Initial saga context
   * @param correlationId Optional correlation ID (will generate if not provided)
   * @returns Promise resolving to created saga
   */
  async createSaga(context: SagaContext, correlationId?: string): Promise<Saga> {
    const sagaCorrelationId = correlationId || this.generateCorrelationId();
    const now = new Date();

    this.logger.info('Creating new saga', {
      correlationId: sagaCorrelationId,
      userId: context.saleRequest.userId,
      storeId: context.saleRequest.storeId,
      itemCount: context.saleRequest.lines.length
    });

    try {
      // Create saga instance
      const sagaInstance = new Saga(
        0, // temporary id, will be set by repository
        sagaCorrelationId,
        SagaState.INITIATED,
        null,
        context,
        now,
        now,
        null,
        null,
        null
      );

      // Persist saga
      const saga = await this.sagaRepository.save(sagaInstance);

      // Log initial step
      await this.logStepTransition(saga, {
        fromState: SagaState.INITIATED,
        toState: SagaState.INITIATED,
        stepName: 'Saga Initialization',
        timestamp: now,
        success: true
      });

      this.logger.info('Created and persisted new saga', {
        sagaId: saga.id,
        correlationId: saga.correlationId,
        state: saga.state
      });

      return saga;

    } catch (error) {
      this.logger.error('Error creating saga', error as Error, {
        correlationId: sagaCorrelationId
      });
      throw error;
    }
  }

  /**
   * Update saga state and persist changes
   * @param saga Saga instance to update
   * @param newState New state to transition to
   * @param stepName Optional step name for tracking
   * @param contextUpdate Optional context updates
   * @returns Promise resolving to updated saga
   */
  async updateSagaState(
    saga: Saga,
    newState: SagaState,
    stepName?: string,
    contextUpdate?: Partial<SagaContext>
  ): Promise<Saga> {
    const startTime = Date.now();
    const fromState = saga.state;

    this.logger.info('Updating saga state', {
      correlationId: saga.correlationId,
      fromState,
      toState: newState,
      stepName,
      hasContextUpdate: !!contextUpdate
    });

    try {
      // Update saga state
      saga.updateState(newState, stepName);

      // Update context if provided
      if (contextUpdate) {
        saga.updateContext(contextUpdate);
        
        await this.logContextUpdate(saga, {
          correlationId: saga.correlationId,
          updateType: stepName || 'state-update',
          updatedFields: Object.keys(contextUpdate),
          timestamp: new Date()
        });
      }

      // Persist saga changes
      const updatedSaga = await this.sagaRepository.update(saga.id, saga);

      const duration = Date.now() - startTime;

      // Log state transition
      await this.logStepTransition(updatedSaga, {
        fromState,
        toState: newState,
        stepName,
        timestamp: new Date(),
        duration,
        success: true
      });

      this.logger.info('Successfully updated saga state', {
        correlationId: saga.correlationId,
        fromState,
        toState: newState,
        duration
      });

      return updatedSaga;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Error updating saga state', error as Error, {
        correlationId: saga.correlationId,
        fromState,
        toState: newState,
        duration
      });

      // Log failed state transition
      await this.logStepTransition(saga, {
        fromState,
        toState: newState,
        stepName,
        timestamp: new Date(),
        duration,
        success: false,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Update saga context and persist changes
   * @param saga Saga instance to update
   * @param contextUpdate Context updates to apply
   * @param updateType Type of update for tracking
   * @returns Promise resolving to updated saga
   */
  async updateSagaContext(
    saga: Saga,
    contextUpdate: Partial<SagaContext>,
    updateType: string = 'context-update'
  ): Promise<Saga> {
    this.logger.info('Updating saga context', {
      correlationId: saga.correlationId,
      updateType,
      updatedFields: Object.keys(contextUpdate)
    });

    try {
      // Update context
      saga.updateContext(contextUpdate);

      // Persist changes
      const updatedSaga = await this.sagaRepository.update(saga.id, saga);

      // Log context update
      await this.logContextUpdate(updatedSaga, {
        correlationId: saga.correlationId,
        updateType,
        updatedFields: Object.keys(contextUpdate),
        timestamp: new Date()
      });

      this.logger.info('Successfully updated saga context', {
        correlationId: saga.correlationId,
        updateType,
        updatedFields: Object.keys(contextUpdate)
      });

      return updatedSaga;

    } catch (error) {
      this.logger.error('Error updating saga context', error as Error, {
        correlationId: saga.correlationId,
        updateType
      });
      throw error;
    }
  }

  /**
   * Mark saga as completed and persist final state
   * @param saga Saga instance to complete
   * @param finalState Final saga state
   * @param error Optional error message if saga failed
   * @returns Promise resolving to completed saga
   */
  async completeSaga(
    saga: Saga,
    finalState: SagaState,
    error?: string
  ): Promise<Saga> {
    this.logger.info('Completing saga', {
      correlationId: saga.correlationId,
      currentState: saga.state,
      finalState,
      hasError: !!error
    });

    try {
      // Update to final state if different
      if (saga.state !== finalState) {
        saga.updateState(finalState);
      }

      // Set error if provided
      if (error) {
        saga.setError(error);
      }

      // Mark as completed
      saga.complete();

      // Persist final changes
      const completedSaga = await this.sagaRepository.update(saga.id, saga);

      // Log completion
      await this.logStepTransition(completedSaga, {
        fromState: saga.state,
        toState: finalState,
        stepName: 'Saga Completion',
        timestamp: new Date(),
        success: !error,
        error
      });

      this.logger.info('Successfully completed saga', {
        correlationId: saga.correlationId,
        finalState,
        duration: saga.getDuration(),
        success: saga.isSuccessful()
      });

      return completedSaga;

    } catch (persistError) {
      this.logger.error('Error completing saga', persistError as Error, {
        correlationId: saga.correlationId,
        finalState
      });
      throw persistError;
    }
  }

  /**
   * Get saga by correlation ID with state tracking
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to saga or null if not found
   */
  async getSagaByCorrelationId(correlationId: string): Promise<Saga | null> {
    this.logger.info('Retrieving saga by correlation ID', { correlationId });

    try {
      const saga = await this.sagaRepository.findByCorrelationId(correlationId);

      if (saga) {
        this.logger.info('Found saga by correlation ID', {
          correlationId,
          sagaId: saga.id,
          state: saga.state,
          isCompleted: saga.isCompleted()
        });
      } else {
        this.logger.warn('Saga not found by correlation ID', { correlationId });
      }

      return saga;

    } catch (error) {
      this.logger.error('Error retrieving saga by correlation ID', error as Error, {
        correlationId
      });
      throw error;
    }
  }

  /**
   * Get saga state history for tracking and debugging
   * @param sagaId Saga ID
   * @returns Promise resolving to array of state transitions
   */
  async getSagaStateHistory(sagaId: number): Promise<SagaStep[]> {
    this.logger.info('Retrieving saga state history', { sagaId });

    try {
      const steps = await this.sagaRepository.findStepsBySagaId(sagaId);

      this.logger.info('Retrieved saga state history', {
        sagaId,
        stepCount: steps.length
      });

      return steps;

    } catch (error) {
      this.logger.error('Error retrieving saga state history', error as Error, {
        sagaId
      });
      throw error;
    }
  }

  /**
   * Check if correlation ID is unique
   * @param correlationId Correlation ID to check
   * @returns Promise resolving to true if unique, false if already exists
   */
  async isCorrelationIdUnique(correlationId: string): Promise<boolean> {
    try {
      const existingSaga = await this.sagaRepository.findByCorrelationId(correlationId);
      const isUnique = !existingSaga;

      this.logger.info('Correlation ID uniqueness check', {
        correlationId,
        isUnique
      });

      return isUnique;

    } catch (error) {
      this.logger.error('Error checking correlation ID uniqueness', error as Error, {
        correlationId
      });
      throw error;
    }
  }

  /**
   * Log step transition for tracking and monitoring
   * @param saga Saga instance
   * @param transitionInfo State transition information
   * @returns Promise resolving when logging is complete
   */
  private async logStepTransition(
    saga: Saga,
    transitionInfo: StateTransitionInfo
  ): Promise<void> {
    try {
      // Create a SagaStep instance for logging
      const sagaStep = new SagaStep(
        0, // temporary id, will be set by repository
        saga.id,
        transitionInfo.stepName || 'Unknown Step',
        transitionInfo.success ? SagaStepState.COMPLETED : SagaStepState.FAILED,
        transitionInfo.timestamp,
        transitionInfo.timestamp,
        transitionInfo.duration || 0,
        transitionInfo.success,
        transitionInfo.error || null,
        {
          fromState: transitionInfo.fromState,
          toState: transitionInfo.toState,
          timestamp: transitionInfo.timestamp.toISOString()
        }
      );

      await this.sagaRepository.logStep(sagaStep);

      this.logger.info('Logged step transition', {
        correlationId: saga.correlationId,
        stepName: transitionInfo.stepName,
        fromState: transitionInfo.fromState,
        toState: transitionInfo.toState,
        success: transitionInfo.success
      });

    } catch (error) {
      // Don't throw on logging errors, just log the error
      this.logger.error('Error logging step transition', error as Error, {
        correlationId: saga.correlationId,
        stepName: transitionInfo.stepName
      });
    }
  }

  /**
   * Log context update for tracking
   * @param saga Saga instance
   * @param updateInfo Context update information
   * @returns Promise resolving when logging is complete
   */
  private async logContextUpdate(
    _saga: Saga,
    updateInfo: ContextUpdateInfo
  ): Promise<void> {
    try {
      this.logger.info('Context update logged', {
        correlationId: updateInfo.correlationId,
        updateType: updateInfo.updateType,
        updatedFields: updateInfo.updatedFields,
        timestamp: updateInfo.timestamp.toISOString()
      });

      // In a real implementation, this could be stored in a separate audit table
      // For now, we'll just log it for monitoring purposes

    } catch (error) {
      // Don't throw on logging errors, just log the error
      this.logger.error('Error logging context update', error as Error, {
        correlationId: updateInfo.correlationId,
        updateType: updateInfo.updateType
      });
    }
  }

  /**
   * Get saga metrics for monitoring
   * @param correlationId Saga correlation ID
   * @returns Promise resolving to saga metrics
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
      const saga = await this.getSagaByCorrelationId(correlationId);
      
      if (!saga) {
        return null;
      }

      const steps = await this.getSagaStateHistory(saga.id);

      return {
        correlationId: saga.correlationId,
        state: saga.state,
        duration: saga.getDuration(),
        stepCount: steps.length,
        isCompleted: saga.isCompleted(),
        isSuccessful: saga.isSuccessful(),
        isFailed: saga.isFailed(),
        totalAmount: saga.getTotalAmount(),
        totalItems: saga.getTotalItems()
      };

    } catch (error) {
      this.logger.error('Error getting saga metrics', error as Error, {
        correlationId
      });
      throw error;
    }
  }
}