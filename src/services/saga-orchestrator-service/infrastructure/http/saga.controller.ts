import { Request, Response } from 'express';
import { createLogger, Logger } from '@shared/infrastructure/logging';
import { SagaOrchestratorUseCase } from '../../application/use-cases/saga-orchestrator.use-case';
import {
  SaleCreationRequestDTO,
  SagaStatusResponseDTO,
  SagaCreationResponseDTO,
  ErrorResponseDTO,
  SaleCreationRequestValidator,
  ErrorResponseBuilder,
  SagaErrorCode
} from '../../application/dtos/saga.dto';
import { SagaState } from '../../domain/enums/saga-state.enum';

/**
 * HTTP controller for saga orchestration operations.
 * Handles saga creation and status queries with proper error handling.
 */
export class SagaController {
  private readonly logger: Logger;

  constructor(
    private readonly sagaOrchestratorUseCase: SagaOrchestratorUseCase
  ) {
    this.logger = createLogger('saga-controller');
  }

  /**
   * Creates a new sale through saga orchestration
   * POST /api/sagas/sales
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async createSale(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let correlationId: string | undefined;

    try {
      this.logger.info('Received sale creation request', {
        body: req.body,
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']
        }
      });

      // Validate request body
      const validation = SaleCreationRequestValidator.validate(req.body);
      if (!validation.isValid) {
        this.logger.warn('Sale creation request validation failed', {
          errors: validation.errors,
          body: req.body
        });

        const errorResponse = ErrorResponseBuilder.validationError(validation.errors);
        res.status(400).json(errorResponse);
        return;
      }

      const saleRequest: SaleCreationRequestDTO = req.body;

      // Execute saga orchestration
      const result = await this.sagaOrchestratorUseCase.createSale(saleRequest);
      correlationId = result.correlationId;

      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.info('Sale creation saga completed successfully', {
          correlationId: result.correlationId,
          sagaState: result.sagaState,
          saleId: result.saleId,
          totalAmount: result.totalAmount,
          duration
        });

        const response: SagaCreationResponseDTO = {
          correlationId: result.correlationId,
          state: result.sagaState,
          message: 'Sale creation saga initiated successfully',
          success: true
        };

        res.status(201).json(response);
      } else {
        this.logger.warn('Sale creation saga failed', {
          correlationId: result.correlationId,
          sagaState: result.sagaState,
          error: result.error,
          duration
        });

        // Map saga state to appropriate HTTP status code
        const statusCode = this.getStatusCodeForFailedSaga(result.sagaState);
        const errorCode = this.getErrorCodeForSagaState(result.sagaState);

        const errorResponse = ErrorResponseBuilder.sagaError(
          errorCode,
          result.error || 'Sale creation failed',
          result.correlationId
        );

        res.status(statusCode).json(errorResponse);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Sale creation request failed with exception', error as Error, {
        correlationId,
        duration,
        body: req.body
      });

      const errorResponse = ErrorResponseBuilder.internalError(
        'An internal error occurred while processing the sale creation request',
        correlationId
      );

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Gets saga status by correlation ID
   * GET /api/sagas/{correlationId}
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async getSagaStatus(req: Request, res: Response): Promise<void> {
    const correlationId = req.params.correlationId;

    try {
      this.logger.info('Received saga status request', {
        correlationId,
        headers: {
          'user-agent': req.headers['user-agent']
        }
      });

      // Validate correlation ID parameter
      if (!correlationId || typeof correlationId !== 'string' || correlationId.trim().length === 0) {
        this.logger.warn('Invalid correlation ID in saga status request', {
          correlationId
        });

        const errorResponse = ErrorResponseBuilder.validationError(
          ['Correlation ID is required and must be a non-empty string'],
          correlationId
        );

        res.status(400).json(errorResponse);
        return;
      }

      // Get saga status from use case
      const result = await this.sagaOrchestratorUseCase.getSagaStatus(correlationId);

      if (!result) {
        this.logger.warn('Saga not found', { correlationId });

        const errorResponse = ErrorResponseBuilder.sagaNotFound(correlationId);
        res.status(404).json(errorResponse);
        return;
      }

      this.logger.info('Retrieved saga status', {
        correlationId,
        state: result.sagaState,
        success: result.success,
        isCompleted: this.isTerminalState(result.sagaState)
      });

      // Build response DTO
      const response: SagaStatusResponseDTO = {
        correlationId: result.correlationId,
        state: result.sagaState,
        currentStep: null, // This would need to be added to the use case result if needed
        createdAt: new Date().toISOString(), // This would need to come from the saga entity
        updatedAt: new Date().toISOString(), // This would need to come from the saga entity
        completedAt: this.isTerminalState(result.sagaState) ? new Date().toISOString() : null,
        duration: result.duration || null,
        success: result.success,
        result: result.saleId ? {
          saleId: result.saleId,
          total: result.totalAmount
        } : undefined,
        error: result.error
      };

      res.status(200).json(response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Saga status request failed with exception', error as Error, {
        correlationId
      });

      const errorResponse = ErrorResponseBuilder.internalError(
        'An internal error occurred while retrieving saga status',
        correlationId
      );

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Health check endpoint for the saga service
   * GET /health
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Basic health check - could be extended to check dependencies
      res.status(200).json({
        status: 'healthy',
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Gets the appropriate HTTP status code for a failed saga state
   * @param sagaState The failed saga state
   * @returns HTTP status code
   */
  private getStatusCodeForFailedSaga(sagaState: SagaState): number {
    switch (sagaState) {
      case SagaState.STOCK_VERIFICATION_FAILED:
        return 409; // Conflict - insufficient stock
      case SagaState.STOCK_RESERVATION_FAILED:
        return 409; // Conflict - unable to reserve stock
      case SagaState.PAYMENT_FAILED:
        return 402; // Payment Required - payment failed
      case SagaState.ORDER_CONFIRMATION_FAILED:
        return 500; // Internal Server Error - system error during confirmation
      case SagaState.FAILED:
        return 500; // Internal Server Error - general failure
      case SagaState.COMPENSATED:
        return 409; // Conflict - operation was rolled back
      default:
        return 500; // Internal Server Error - unknown failure state
    }
  }

  /**
   * Gets the appropriate error code for a saga state
   * @param sagaState The saga state
   * @returns Saga error code
   */
  private getErrorCodeForSagaState(sagaState: SagaState): SagaErrorCode {
    switch (sagaState) {
      case SagaState.STOCK_VERIFICATION_FAILED:
        return SagaErrorCode.STOCK_VERIFICATION_FAILED;
      case SagaState.STOCK_RESERVATION_FAILED:
        return SagaErrorCode.STOCK_RESERVATION_FAILED;
      case SagaState.PAYMENT_FAILED:
        return SagaErrorCode.PAYMENT_FAILED;
      case SagaState.ORDER_CONFIRMATION_FAILED:
        return SagaErrorCode.ORDER_CONFIRMATION_FAILED;
      case SagaState.FAILED:
        return SagaErrorCode.COMPENSATION_FAILED;
      case SagaState.COMPENSATED:
        return SagaErrorCode.COMPENSATION_FAILED;
      default:
        return SagaErrorCode.INTERNAL_ERROR;
    }
  }

  /**
   * Checks if a saga state is terminal (completed)
   * @param state Saga state to check
   * @returns true if state is terminal, false otherwise
   */
  private isTerminalState(state: SagaState): boolean {
    return [
      SagaState.SALE_CONFIRMED,
      SagaState.STOCK_VERIFICATION_FAILED,
      SagaState.STOCK_RESERVATION_FAILED,
      SagaState.COMPENSATED,
      SagaState.FAILED
    ].includes(state);
  }
}