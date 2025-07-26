/**
 * Saga Step Entity
 * 
 * Represents a single step execution within a saga workflow with timing and result tracking
 */
export class SagaStep {
  constructor(
    public readonly id: number,
    public readonly sagaId: number,
    public readonly stepName: string,
    public state: SagaStepState,
    public readonly startedAt: Date,
    public completedAt: Date | null = null,
    public duration: number | null = null, // in milliseconds
    public success: boolean | null = null,
    public errorMessage: string | null = null,
    public stepData: any = null
  ) {}

  /**
   * Marks the step as completed successfully
   * @param data Optional step result data
   */
  markAsCompleted(data?: any): void {
    if (this.state !== SagaStepState.RUNNING) {
      throw new Error(`Cannot complete step in state: ${this.state}`);
    }

    this.completedAt = new Date();
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
    this.success = true;
    this.state = SagaStepState.COMPLETED;
    
    if (data !== undefined) {
      this.stepData = data;
    }
  }

  /**
   * Marks the step as failed
   * @param error The error message
   * @param data Optional error context data
   */
  markAsFailed(error: string, data?: any): void {
    if (this.state !== SagaStepState.RUNNING) {
      throw new Error(`Cannot fail step in state: ${this.state}`);
    }

    this.completedAt = new Date();
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
    this.success = false;
    this.errorMessage = error;
    this.state = SagaStepState.FAILED;
    
    if (data !== undefined) {
      this.stepData = data;
    }
  }

  /**
   * Marks the step as skipped
   * @param reason The reason for skipping
   */
  markAsSkipped(reason: string): void {
    if (this.state !== SagaStepState.PENDING) {
      throw new Error(`Cannot skip step in state: ${this.state}`);
    }

    this.completedAt = new Date();
    this.duration = 0;
    this.success = null;
    this.errorMessage = reason;
    this.state = SagaStepState.SKIPPED;
  }

  /**
   * Starts the step execution
   */
  start(): void {
    if (this.state !== SagaStepState.PENDING) {
      throw new Error(`Cannot start step in state: ${this.state}`);
    }

    this.state = SagaStepState.RUNNING;
  }

  /**
   * Updates the step data during execution
   * @param data The data to update
   */
  updateStepData(data: any): void {
    this.stepData = { ...this.stepData, ...data };
  }

  /**
   * Checks if the step is completed (successfully or with failure)
   * @returns true if step is completed, false otherwise
   */
  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  /**
   * Checks if the step was successful
   * @returns true if step was successful, false otherwise
   */
  isSuccessful(): boolean {
    return this.success === true;
  }

  /**
   * Checks if the step failed
   * @returns true if step failed, false otherwise
   */
  isFailed(): boolean {
    return this.success === false;
  }

  /**
   * Checks if the step is currently running
   * @returns true if step is running, false otherwise
   */
  isRunning(): boolean {
    return this.state === SagaStepState.RUNNING;
  }

  /**
   * Checks if the step is pending
   * @returns true if step is pending, false otherwise
   */
  isPending(): boolean {
    return this.state === SagaStepState.PENDING;
  }

  /**
   * Checks if the step was skipped
   * @returns true if step was skipped, false otherwise
   */
  isSkipped(): boolean {
    return this.state === SagaStepState.SKIPPED;
  }

  /**
   * Gets the execution duration in milliseconds
   * @returns Duration in milliseconds, or null if not completed
   */
  getDuration(): number | null {
    return this.duration;
  }

  /**
   * Gets the execution duration in seconds
   * @returns Duration in seconds, or null if not completed
   */
  getDurationInSeconds(): number | null {
    return this.duration ? this.duration / 1000 : null;
  }

  /**
   * Validates the step state and data consistency
   * @returns Array of validation errors, empty if valid
   */
  validate(): string[] {
    const errors: string[] = [];

    // Check state consistency
    if (this.isCompleted() && this.completedAt === null) {
      errors.push('Step marked as completed but completedAt is null');
    }

    if (this.isCompleted() && this.duration === null) {
      errors.push('Step marked as completed but duration is null');
    }

    if (this.isSuccessful() && this.state !== SagaStepState.COMPLETED) {
      errors.push('Step marked as successful but state is not COMPLETED');
    }

    if (this.isFailed() && this.state !== SagaStepState.FAILED) {
      errors.push('Step marked as failed but state is not FAILED');
    }

    if (this.isFailed() && !this.errorMessage) {
      errors.push('Step marked as failed but no error message provided');
    }

    // Check timing consistency
    if (this.completedAt && this.completedAt < this.startedAt) {
      errors.push('completedAt cannot be before startedAt');
    }

    if (this.duration !== null && this.duration < 0) {
      errors.push('Duration cannot be negative');
    }

    return errors;
  }

  /**
   * Creates a summary of the step for logging/monitoring
   * @returns Step summary object
   */
  getSummary(): {
    stepName: string;
    state: SagaStepState;
    success: boolean | null;
    duration: number | null;
    errorMessage: string | null;
    startedAt: Date;
    completedAt: Date | null;
  } {
    return {
      stepName: this.stepName,
      state: this.state,
      success: this.success,
      duration: this.duration,
      errorMessage: this.errorMessage,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Creates a performance metrics object for the step
   * @returns Performance metrics object
   */
  getPerformanceMetrics(): {
    stepName: string;
    duration: number | null;
    success: boolean | null;
    timestamp: Date;
  } {
    return {
      stepName: this.stepName,
      duration: this.duration,
      success: this.success,
      timestamp: this.completedAt || this.startedAt
    };
  }
}

/**
 * Saga Step State Enum
 * 
 * Defines the possible states of a saga step
 */
export enum SagaStepState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

/**
 * Saga Step Factory
 * 
 * Factory class for creating saga step instances
 */
export class SagaStepFactory {
  /**
   * Creates a new saga step in pending state
   * @param sagaId The saga ID
   * @param stepName The step name
   * @param id Optional step ID (for database persistence)
   * @returns New SagaStep instance
   */
  static createPendingStep(sagaId: number, stepName: string, id?: number): SagaStep {
    return new SagaStep(
      id || 0,
      sagaId,
      stepName,
      SagaStepState.PENDING,
      new Date()
    );
  }

  /**
   * Creates a saga step from database data
   * @param data Database row data
   * @returns SagaStep instance
   */
  static fromDatabaseRow(data: {
    id: number;
    sagaId: number;
    stepName: string;
    state: string;
    startedAt: Date;
    completedAt?: Date | null;
    duration?: number | null;
    success?: boolean | null;
    errorMessage?: string | null;
    stepData?: any;
  }): SagaStep {
    return new SagaStep(
      data.id,
      data.sagaId,
      data.stepName,
      data.state as SagaStepState,
      data.startedAt,
      data.completedAt || null,
      data.duration || null,
      data.success || null,
      data.errorMessage || null,
      data.stepData || null
    );
  }
}