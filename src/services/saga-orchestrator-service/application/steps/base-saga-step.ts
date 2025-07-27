/**
 * Base Saga Step Implementation
 * 
 * Provides common functionality for saga steps including timing, metrics collection,
 * and error handling
 */

import { ISagaStep, StepResult, CompensationResult, StepMetrics } from '../interfaces/saga-step.interface';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { createLogger, Logger } from '@shared/infrastructure/logging';

/**
 * Abstract base class for saga steps with common functionality
 */
export abstract class BaseSagaStep implements ISagaStep {
  protected readonly logger: Logger;
  
  constructor(public readonly name: string) {
    this.logger = createLogger(`saga-step-${name.toLowerCase().replace(/\s+/g, '-')}`);
  }

  /**
   * Execute the step with timing and metrics collection
   */
  async execute(context: SagaContext): Promise<StepResult> {
    const startTime = Date.now();
    
    this.logger.info(`Starting step execution: ${this.name}`, {
      correlationId: this.getCorrelationId(context),
      stepName: this.name
    });

    try {
      // Validate context before execution
      this.validateContext(context);
      
      // Execute the actual step logic
      const result = await this.executeStep(context);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.info(`Step completed successfully: ${this.name}`, {
          correlationId: this.getCorrelationId(context),
          stepName: this.name,
          duration,
          nextState: result.nextState
        });
      } else {
        this.logger.error(`Step failed: ${this.name}`, undefined, {
          correlationId: this.getCorrelationId(context),
          stepName: this.name,
          duration,
          error: result.error,
          nextState: result.nextState
        });
      }

      // Emit metrics
      this.emitMetrics({
        stepName: this.name,
        duration,
        success: result.success,
        timestamp: new Date(),
        error: result.error
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Step execution threw exception: ${this.name}`, error instanceof Error ? error : undefined, {
        correlationId: this.getCorrelationId(context),
        stepName: this.name,
        duration,
        error: errorMessage
      });

      // Emit failure metrics
      this.emitMetrics({
        stepName: this.name,
        duration,
        success: false,
        timestamp: new Date(),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        nextState: this.getFailureState(context)
      };
    }
  }

  /**
   * Compensate with timing and metrics collection
   */
  async compensate(context: SagaContext): Promise<CompensationResult> {
    if (!this.canCompensate()) {
      this.logger.warn(`Compensation not supported for step: ${this.name}`, {
        correlationId: this.getCorrelationId(context),
        stepName: this.name
      });
      
      return {
        success: true // No compensation needed
      };
    }

    const startTime = Date.now();
    
    this.logger.info(`Starting compensation: ${this.name}`, {
      correlationId: this.getCorrelationId(context),
      stepName: this.name
    });

    try {
      const result = await this.compensateStep(context);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.info(`Compensation completed successfully: ${this.name}`, {
          correlationId: this.getCorrelationId(context),
          stepName: this.name,
          duration
        });
      } else {
        this.logger.error(`Compensation failed: ${this.name}`, undefined, {
          correlationId: this.getCorrelationId(context),
          stepName: this.name,
          duration,
          error: result.error
        });
      }

      // Emit compensation metrics
      this.emitCompensationMetrics({
        stepName: this.name,
        duration,
        success: result.success,
        timestamp: new Date(),
        error: result.error
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error(`Compensation threw exception: ${this.name}`, error instanceof Error ? error : undefined, {
        correlationId: this.getCorrelationId(context),
        stepName: this.name,
        duration,
        error: errorMessage
      });

      // Emit compensation failure metrics
      this.emitCompensationMetrics({
        stepName: this.name,
        duration,
        success: false,
        timestamp: new Date(),
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Abstract method for actual step execution logic
   * Must be implemented by concrete step classes
   */
  protected abstract executeStep(context: SagaContext): Promise<StepResult>;

  /**
   * Abstract method for compensation logic
   * Must be implemented by concrete step classes that support compensation
   */
  protected abstract compensateStep(context: SagaContext): Promise<CompensationResult>;

  /**
   * Abstract method to get the next state after successful execution
   */
  public abstract getNextState(context: SagaContext): SagaState;

  /**
   * Abstract method to get the failure state if execution fails
   */
  public abstract getFailureState(context: SagaContext): SagaState;

  /**
   * Default implementation returns false - override in compensatable steps
   */
  public canCompensate(): boolean {
    return false;
  }

  /**
   * Validate the saga context before step execution
   * Override in concrete steps for specific validation
   */
  protected validateContext(context: SagaContext): void {
    if (!context) {
      throw new Error('Saga context is required');
    }

    if (!context.saleRequest) {
      throw new Error('Sale request is required in saga context');
    }

    if (!context.saleRequest.userId || !context.saleRequest.storeId) {
      throw new Error('User ID and Store ID are required in sale request');
    }

    if (!context.saleRequest.lines || context.saleRequest.lines.length === 0) {
      throw new Error('Sale request must contain at least one line item');
    }
  }

  /**
   * Extract correlation ID from context for logging
   */
  protected getCorrelationId(context: SagaContext): string {
    // In a real implementation, this would be passed through the context
    // For now, we'll generate a simple identifier
    return `${context.saleRequest.userId}-${context.saleRequest.storeId}-${Date.now()}`;
  }

  /**
   * Emit step execution metrics
   * In a real implementation, this would integrate with Prometheus
   */
  protected emitMetrics(metrics: StepMetrics): void {
    // TODO: Integrate with Prometheus metrics collection
    this.logger.info('Step metrics', {
      stepName: metrics.stepName,
      duration: metrics.duration,
      success: metrics.success,
      timestamp: metrics.timestamp.toISOString(),
      ...(metrics.error && { error: metrics.error })
    });
  }

  /**
   * Emit compensation metrics
   */
  protected emitCompensationMetrics(metrics: StepMetrics): void {
    // TODO: Integrate with Prometheus metrics collection
    this.logger.info('Compensation metrics', {
      stepName: `${metrics.stepName}-compensation`,
      duration: metrics.duration,
      success: metrics.success,
      timestamp: metrics.timestamp.toISOString(),
      ...(metrics.error && { error: metrics.error })
    });
  }

  /**
   * Helper method to calculate total amount from sale request
   */
  protected calculateTotalAmount(context: SagaContext): number {
    return context.saleRequest.lines.reduce(
      (total, line) => total + (line.quantity * line.unitPrice),
      0
    );
  }

  /**
   * Helper method to get total item count from sale request
   */
  protected getTotalItemCount(context: SagaContext): number {
    return context.saleRequest.lines.reduce(
      (total, line) => total + line.quantity,
      0
    );
  }

  /**
   * Helper method to format currency amounts for logging
   */
  protected formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Helper method to create a timeout promise for operations
   */
  protected createTimeoutPromise<T>(timeoutMs: number, operation: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Helper method to execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      operation,
      this.createTimeoutPromise<T>(timeoutMs, operationName)
    ]);
  }
}