/**
 * Saga State Enum
 * 
 * Defines all possible states in the saga workflow from initiation to completion,
 * including failure and compensation states.
 */
export enum SagaState {
  // Initial state
  INITIATED = 'INITIATED',
  
  // Stock verification states
  STOCK_VERIFYING = 'STOCK_VERIFYING',
  STOCK_VERIFIED = 'STOCK_VERIFIED',
  STOCK_VERIFICATION_FAILED = 'STOCK_VERIFICATION_FAILED',
  
  // Stock reservation states
  STOCK_RESERVING = 'STOCK_RESERVING',
  STOCK_RESERVED = 'STOCK_RESERVED',
  STOCK_RESERVATION_FAILED = 'STOCK_RESERVATION_FAILED',
  
  // Payment processing states
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Order confirmation states
  ORDER_CONFIRMING = 'ORDER_CONFIRMING',
  SALE_CONFIRMED = 'SALE_CONFIRMED',
  ORDER_CONFIRMATION_FAILED = 'ORDER_CONFIRMATION_FAILED',
  
  // Compensation states
  COMPENSATING_STOCK = 'COMPENSATING_STOCK',
  COMPENSATING_PAYMENT = 'COMPENSATING_PAYMENT',
  COMPENSATED = 'COMPENSATED',
  
  // Final failure state
  FAILED = 'FAILED'
}

/**
 * State transition validation and utility methods
 */
export class SagaStateTransitions {
  
  /**
   * Valid state transitions mapping
   */
  private static readonly VALID_TRANSITIONS: Record<SagaState, SagaState[]> = {
    [SagaState.INITIATED]: [SagaState.STOCK_VERIFYING],
    
    [SagaState.STOCK_VERIFYING]: [
      SagaState.STOCK_VERIFIED,
      SagaState.STOCK_VERIFICATION_FAILED
    ],
    
    [SagaState.STOCK_VERIFIED]: [SagaState.STOCK_RESERVING],
    
    [SagaState.STOCK_RESERVING]: [
      SagaState.STOCK_RESERVED,
      SagaState.STOCK_RESERVATION_FAILED
    ],
    
    [SagaState.STOCK_RESERVED]: [SagaState.PAYMENT_PROCESSING],
    
    [SagaState.PAYMENT_PROCESSING]: [
      SagaState.PAYMENT_PROCESSED,
      SagaState.PAYMENT_FAILED
    ],
    
    [SagaState.PAYMENT_PROCESSED]: [SagaState.ORDER_CONFIRMING],
    
    [SagaState.ORDER_CONFIRMING]: [
      SagaState.SALE_CONFIRMED,
      SagaState.ORDER_CONFIRMATION_FAILED
    ],
    
    // Failure states that can trigger compensation
    [SagaState.PAYMENT_FAILED]: [SagaState.COMPENSATING_STOCK],
    [SagaState.ORDER_CONFIRMATION_FAILED]: [SagaState.COMPENSATING_PAYMENT],
    
    // Compensation states
    [SagaState.COMPENSATING_PAYMENT]: [SagaState.COMPENSATING_STOCK],
    [SagaState.COMPENSATING_STOCK]: [SagaState.COMPENSATED, SagaState.FAILED],
    
    // Terminal states (no transitions allowed)
    [SagaState.STOCK_VERIFICATION_FAILED]: [],
    [SagaState.STOCK_RESERVATION_FAILED]: [],
    [SagaState.SALE_CONFIRMED]: [],
    [SagaState.COMPENSATED]: [],
    [SagaState.FAILED]: []
  };

  /**
   * Validates if a state transition is allowed
   * @param fromState Current state
   * @param toState Target state
   * @returns true if transition is valid, false otherwise
   */
  static isValidTransition(fromState: SagaState, toState: SagaState): boolean {
    const allowedTransitions = this.VALID_TRANSITIONS[fromState];
    return allowedTransitions ? allowedTransitions.includes(toState) : false;
  }

  /**
   * Gets all valid next states for a given current state
   * @param currentState Current saga state
   * @returns Array of valid next states
   */
  static getValidNextStates(currentState: SagaState): SagaState[] {
    return this.VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Checks if a state is a terminal state (no further transitions possible)
   * @param state State to check
   * @returns true if state is terminal, false otherwise
   */
  static isTerminalState(state: SagaState): boolean {
    const nextStates = this.VALID_TRANSITIONS[state];
    return !nextStates || nextStates.length === 0;
  }

  /**
   * Checks if a state represents a successful completion
   * @param state State to check
   * @returns true if state represents success, false otherwise
   */
  static isSuccessState(state: SagaState): boolean {
    return state === SagaState.SALE_CONFIRMED;
  }

  /**
   * Checks if a state represents a failure
   * @param state State to check
   * @returns true if state represents failure, false otherwise
   */
  static isFailureState(state: SagaState): boolean {
    return [
      SagaState.STOCK_VERIFICATION_FAILED,
      SagaState.STOCK_RESERVATION_FAILED,
      SagaState.PAYMENT_FAILED,
      SagaState.ORDER_CONFIRMATION_FAILED,
      SagaState.FAILED
    ].includes(state);
  }

  /**
   * Checks if a state represents a compensation state
   * @param state State to check
   * @returns true if state is a compensation state, false otherwise
   */
  static isCompensationState(state: SagaState): boolean {
    return [
      SagaState.COMPENSATING_STOCK,
      SagaState.COMPENSATING_PAYMENT,
      SagaState.COMPENSATED
    ].includes(state);
  }

  /**
   * Checks if a state can trigger compensation actions
   * @param state State to check
   * @returns true if state can trigger compensation, false otherwise
   */
  static canTriggerCompensation(state: SagaState): boolean {
    return [
      SagaState.PAYMENT_FAILED,
      SagaState.ORDER_CONFIRMATION_FAILED
    ].includes(state);
  }

  /**
   * Gets the appropriate compensation state for a failed state
   * @param failedState The failed state
   * @returns The compensation state to transition to, or null if no compensation needed
   */
  static getCompensationState(failedState: SagaState): SagaState | null {
    switch (failedState) {
      case SagaState.PAYMENT_FAILED:
        return SagaState.COMPENSATING_STOCK;
      case SagaState.ORDER_CONFIRMATION_FAILED:
        return SagaState.COMPENSATING_PAYMENT;
      default:
        return null;
    }
  }
}