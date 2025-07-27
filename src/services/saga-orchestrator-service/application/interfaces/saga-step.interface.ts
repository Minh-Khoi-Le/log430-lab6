/**
 * Saga Step Interface
 * 
 * Defines the contract for saga workflow steps including execution and compensation
 */

import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';

/**
 * Result of a saga step execution
 */
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  nextState: SagaState;
}

/**
 * Result of a compensation action
 */
export interface CompensationResult {
  success: boolean;
  error?: string;
}

/**
 * Step execution metrics for monitoring
 */
export interface StepMetrics {
  stepName: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  error?: string;
}

/**
 * Interface for saga workflow steps
 */
export interface ISagaStep {
  /**
   * The name of the step for identification and logging
   */
  readonly name: string;

  /**
   * Execute the step with the given saga context
   * @param context The current saga context
   * @returns Promise resolving to step execution result
   */
  execute(context: SagaContext): Promise<StepResult>;

  /**
   * Compensate for this step's actions (undo/rollback)
   * @param context The current saga context
   * @returns Promise resolving to compensation result
   */
  compensate(context: SagaContext): Promise<CompensationResult>;

  /**
   * Indicates whether this step supports compensation
   * @returns true if step can be compensated, false otherwise
   */
  canCompensate(): boolean;

  /**
   * Get the expected next state after successful execution
   * @param context The current saga context
   * @returns The expected next saga state
   */
  getNextState(context: SagaContext): SagaState;

  /**
   * Get the failure state if step execution fails
   * @param context The current saga context
   * @returns The failure saga state
   */
  getFailureState(context: SagaContext): SagaState;
}