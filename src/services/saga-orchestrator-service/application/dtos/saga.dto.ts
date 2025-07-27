// Saga Data Transfer Objects

import { SagaState } from '../../domain/enums/saga-state.enum';

/**
 * DTO for creating a new sale through the saga orchestrator
 */
export interface SaleCreationRequestDTO {
  userId: number;
  storeId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * DTO for saga status response
 */
export interface SagaStatusResponseDTO {
  correlationId: string;
  state: SagaState;
  currentStep: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  duration: number | null;
  success: boolean;
  result?: {
    saleId?: number;
    total?: number;
  };
  error?: string;
}

/**
 * DTO for saga creation response
 */
export interface SagaCreationResponseDTO {
  correlationId: string;
  state: SagaState;
  message: string;
  success: boolean;
}

/**
 * DTO for error responses
 */
export interface ErrorResponseDTO {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  correlationId?: string;
}

/**
 * Validation utility for SaleCreationRequestDTO
 */
export class SaleCreationRequestValidator {
  /**
   * Validates a sale creation request
   * @param request The request to validate
   * @returns Validation result with errors if any
   */
  static validate(request: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if request exists
    if (!request) {
      errors.push('Request body is required');
      return { isValid: false, errors };
    }

    // Validate userId
    if (!request.userId || typeof request.userId !== 'number' || request.userId <= 0) {
      errors.push('userId must be a positive number');
    }

    // Validate storeId
    if (!request.storeId || typeof request.storeId !== 'number' || request.storeId <= 0) {
      errors.push('storeId must be a positive number');
    }

    // Validate lines array
    if (!request.lines || !Array.isArray(request.lines) || request.lines.length === 0) {
      errors.push('lines must be a non-empty array');
    } else {
      // Validate each line item
      request.lines.forEach((line: any, index: number) => {
        if (!line.productId || typeof line.productId !== 'number' || line.productId <= 0) {
          errors.push(`lines[${index}].productId must be a positive number`);
        }

        if (!line.quantity || typeof line.quantity !== 'number' || line.quantity <= 0) {
          errors.push(`lines[${index}].quantity must be a positive number`);
        }

        if (line.unitPrice === undefined || typeof line.unitPrice !== 'number' || line.unitPrice < 0) {
          errors.push(`lines[${index}].unitPrice must be a non-negative number`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Error codes for saga operations
 */
export enum SagaErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SAGA_NOT_FOUND = 'SAGA_NOT_FOUND',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  STOCK_VERIFICATION_FAILED = 'STOCK_VERIFICATION_FAILED',
  STOCK_RESERVATION_FAILED = 'STOCK_RESERVATION_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_CONFIRMATION_FAILED = 'ORDER_CONFIRMATION_FAILED',
  COMPENSATION_FAILED = 'COMPENSATION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Utility class for creating standardized error responses
 */
export class ErrorResponseBuilder {
  /**
   * Creates a validation error response
   * @param errors Array of validation error messages
   * @param correlationId Optional correlation ID
   * @returns ErrorResponseDTO
   */
  static validationError(errors: string[], correlationId?: string): ErrorResponseDTO {
    return {
      success: false,
      error: {
        code: SagaErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: errors
      },
      timestamp: new Date().toISOString(),
      correlationId
    };
  }

  /**
   * Creates a saga not found error response
   * @param correlationId The correlation ID that was not found
   * @returns ErrorResponseDTO
   */
  static sagaNotFound(correlationId: string): ErrorResponseDTO {
    return {
      success: false,
      error: {
        code: SagaErrorCode.SAGA_NOT_FOUND,
        message: `Saga with correlation ID '${correlationId}' not found`
      },
      timestamp: new Date().toISOString(),
      correlationId
    };
  }

  /**
   * Creates a service unavailable error response
   * @param serviceName Name of the unavailable service
   * @param correlationId Optional correlation ID
   * @returns ErrorResponseDTO
   */
  static serviceUnavailable(serviceName: string, correlationId?: string): ErrorResponseDTO {
    return {
      success: false,
      error: {
        code: SagaErrorCode.SERVICE_UNAVAILABLE,
        message: `Service '${serviceName}' is currently unavailable`
      },
      timestamp: new Date().toISOString(),
      correlationId
    };
  }

  /**
   * Creates an internal error response
   * @param message Error message
   * @param correlationId Optional correlation ID
   * @returns ErrorResponseDTO
   */
  static internalError(message: string, correlationId?: string): ErrorResponseDTO {
    return {
      success: false,
      error: {
        code: SagaErrorCode.INTERNAL_ERROR,
        message: message || 'An internal error occurred'
      },
      timestamp: new Date().toISOString(),
      correlationId
    };
  }

  /**
   * Creates a saga-specific error response
   * @param code Error code
   * @param message Error message
   * @param correlationId Optional correlation ID
   * @returns ErrorResponseDTO
   */
  static sagaError(code: SagaErrorCode, message: string, correlationId?: string): ErrorResponseDTO {
    return {
      success: false,
      error: {
        code,
        message
      },
      timestamp: new Date().toISOString(),
      correlationId
    };
  }
}