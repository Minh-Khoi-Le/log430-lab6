import { SagaState, SagaStateTransitions } from '../enums/saga-state.enum';
import { SagaContext } from './saga-context.interface';

/**
 * Saga Entity
 * 
 * Represents a saga instance with state management capabilities
 */
export class Saga {
  constructor(
    public readonly id: number,
    public readonly correlationId: string,
    public state: SagaState,
    public currentStep: string | null,
    public context: SagaContext,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public completedAt: Date | null = null,
    public errorMessage: string | null = null,
    public compensationData: any = null
  ) {}

  /**
   * Updates the saga state with validation
   * @param newState The new state to transition to
   * @param step Optional step name for tracking
   * @throws Error if state transition is invalid
   */
  updateState(newState: SagaState, step?: string): void {
    if (!SagaStateTransitions.isValidTransition(this.state, newState)) {
      throw new Error(
        `Invalid state transition from ${this.state} to ${newState}. ` +
        `Valid transitions are: ${SagaStateTransitions.getValidNextStates(this.state).join(', ')}`
      );
    }

    this.state = newState;
    this.currentStep = step || null;
    this.updatedAt = new Date();
  }

  /**
   * Marks the saga as completed
   */
  complete(): void {
    if (!SagaStateTransitions.isTerminalState(this.state)) {
      throw new Error(`Cannot complete saga in non-terminal state: ${this.state}`);
    }

    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Sets an error message for the saga
   * @param error The error message
   */
  setError(error: string): void {
    this.errorMessage = error;
    this.updatedAt = new Date();
  }

  /**
   * Clears the error message
   */
  clearError(): void {
    this.errorMessage = null;
    this.updatedAt = new Date();
  }

  /**
   * Sets compensation data
   * @param data The compensation data
   */
  setCompensationData(data: any): void {
    this.compensationData = data;
    this.updatedAt = new Date();
  }

  /**
   * Updates the saga context
   * @param contextUpdate Partial context update
   */
  updateContext(contextUpdate: Partial<SagaContext>): void {
    this.context = { ...this.context, ...contextUpdate };
    this.updatedAt = new Date();
  }

  /**
   * Adds a compensation action to the context
   * @param action The action name
   * @param data The action data
   */
  addCompensationAction(action: string, data: any): void {
    if (!this.context.compensationActions) {
      this.context.compensationActions = [];
    }

    this.context.compensationActions.push({
      action,
      data,
      completed: false
    });

    this.updatedAt = new Date();
  }

  /**
   * Marks a compensation action as completed
   * @param action The action name
   */
  markCompensationActionCompleted(action: string): void {
    if (this.context.compensationActions) {
      const actionItem = this.context.compensationActions.find(a => a.action === action);
      if (actionItem) {
        actionItem.completed = true;
        this.updatedAt = new Date();
      }
    }
  }

  /**
   * Checks if the saga is completed
   * @returns true if saga is completed, false otherwise
   */
  isCompleted(): boolean {
    return this.completedAt !== null;
  }

  /**
   * Checks if the saga can be compensated
   * @returns true if saga can be compensated, false otherwise
   */
  canCompensate(): boolean {
    return SagaStateTransitions.canTriggerCompensation(this.state);
  }

  /**
   * Checks if the saga is in a success state
   * @returns true if saga succeeded, false otherwise
   */
  isSuccessful(): boolean {
    return SagaStateTransitions.isSuccessState(this.state);
  }

  /**
   * Checks if the saga is in a failure state
   * @returns true if saga failed, false otherwise
   */
  isFailed(): boolean {
    return SagaStateTransitions.isFailureState(this.state);
  }

  /**
   * Checks if the saga is in a compensation state
   * @returns true if saga is being compensated, false otherwise
   */
  isCompensating(): boolean {
    return SagaStateTransitions.isCompensationState(this.state);
  }

  /**
   * Checks if the saga is in a terminal state
   * @returns true if saga is in terminal state, false otherwise
   */
  isTerminal(): boolean {
    return SagaStateTransitions.isTerminalState(this.state);
  }

  /**
   * Gets the next valid states for the current state
   * @returns Array of valid next states
   */
  getValidNextStates(): SagaState[] {
    return SagaStateTransitions.getValidNextStates(this.state);
  }

  /**
   * Gets the appropriate compensation state for the current failed state
   * @returns The compensation state or null if no compensation needed
   */
  getCompensationState(): SagaState | null {
    return SagaStateTransitions.getCompensationState(this.state);
  }

  /**
   * Calculates the total amount from the sale request
   * @returns The total amount
   */
  getTotalAmount(): number {
    return this.context.saleRequest.lines.reduce(
      (total, line) => total + (line.quantity * line.unitPrice),
      0
    );
  }

  /**
   * Gets the total number of items in the sale request
   * @returns The total item count
   */
  getTotalItems(): number {
    return this.context.saleRequest.lines.reduce(
      (total, line) => total + line.quantity,
      0
    );
  }

  /**
   * Gets the duration of the saga execution in milliseconds
   * @returns Duration in milliseconds, or null if not completed
   */
  getDuration(): number | null {
    if (!this.completedAt) {
      return null;
    }
    return this.completedAt.getTime() - this.createdAt.getTime();
  }

  /**
   * Gets pending compensation actions
   * @returns Array of pending compensation actions
   */
  getPendingCompensationActions(): Array<{ action: string; data: any }> {
    if (!this.context.compensationActions) {
      return [];
    }
    return this.context.compensationActions
      .filter(action => !action.completed)
      .map(action => ({ action: action.action, data: action.data }));
  }

  /**
   * Checks if all compensation actions are completed
   * @returns true if all compensation actions are completed, false otherwise
   */
  areAllCompensationActionsCompleted(): boolean {
    if (!this.context.compensationActions || this.context.compensationActions.length === 0) {
      return true;
    }
    return this.context.compensationActions.every(action => action.completed);
  }

  /**
   * Creates a summary of the saga for logging/monitoring
   * @returns Saga summary object
   */
  getSummary(): {
    correlationId: string;
    state: SagaState;
    currentStep: string | null;
    isCompleted: boolean;
    isSuccessful: boolean;
    isFailed: boolean;
    duration: number | null;
    totalAmount: number;
    totalItems: number;
    errorMessage: string | null;
  } {
    return {
      correlationId: this.correlationId,
      state: this.state,
      currentStep: this.currentStep,
      isCompleted: this.isCompleted(),
      isSuccessful: this.isSuccessful(),
      isFailed: this.isFailed(),
      duration: this.getDuration(),
      totalAmount: this.getTotalAmount(),
      totalItems: this.getTotalItems(),
      errorMessage: this.errorMessage
    };
  }
}