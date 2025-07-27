/**
 * Saga State Manager Tests
 * 
 * Tests for saga state management and persistence functionality
 */

import { SagaStateManager } from '../application/use-cases/saga-state-manager.use-case';
import { Saga } from '../domain/entities/saga.entity';
import { SagaContext } from '../domain/entities/saga-context.interface';
import { SagaState } from '../domain/enums/saga-state.enum';
import { SagaStep, SagaStepState } from '../domain/entities/saga-step.entity';
import { ISagaRepository } from '../domain/repositories/saga.repository';

// Mock repository
const mockRepository: jest.Mocked<ISagaRepository> = {
  findById: jest.fn(),
  findByCorrelationId: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByState: jest.fn(),
  findByStates: jest.fn(),
  findByUserId: jest.fn(),
  findByStoreId: jest.fn(),
  findActiveByUserId: jest.fn(),
  findCompletedSagas: jest.fn(),
  findFailedSagas: jest.fn(),
  findSagasCreatedAfter: jest.fn(),
  findSagasCreatedBefore: jest.fn(),
  findSagasCreatedBetween: jest.fn(),
  findSagasCompletedBetween: jest.fn(),
  findWithPagination: jest.fn(),
  logStep: jest.fn(),
  updateStep: jest.fn(),
  findStepsBySagaId: jest.fn(),
  findStepsByName: jest.fn(),
  findFailedSteps: jest.fn(),
  recordMetric: jest.fn(),
  getSuccessRate: jest.fn(),
  getAverageDuration: jest.fn(),
  getFailuresByType: jest.fn(),
  getStepPerformanceMetrics: jest.fn(),
  deleteCompletedSagasOlderThan: jest.fn(),
  deleteFailedSagasOlderThan: jest.fn(),
  deleteStepLogsOlderThan: jest.fn(),
  executeInSagaTransaction: jest.fn(),
  healthCheck: jest.fn(),
  getConnectionMetrics: jest.fn()
};

describe('SagaStateManager', () => {
  let stateManager: SagaStateManager;
  let mockSagaContext: SagaContext;

  beforeEach(() => {
    jest.clearAllMocks();
    stateManager = new SagaStateManager(mockRepository);
    
    mockSagaContext = {
      saleRequest: {
        userId: 1,
        storeId: 1,
        lines: [
          { productId: 1, quantity: 2, unitPrice: 10.00 }
        ]
      }
    };
  });

  describe('generateCorrelationId', () => {
    it('should generate a unique correlation ID', () => {
      const correlationId1 = stateManager.generateCorrelationId();
      const correlationId2 = stateManager.generateCorrelationId();

      expect(correlationId1).toBeDefined();
      expect(correlationId2).toBeDefined();
      expect(correlationId1).not.toBe(correlationId2);
      expect(correlationId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('createSaga', () => {
    it('should create and persist a new saga with initial state', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.INITIATED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      mockRepository.save.mockResolvedValue(mockSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.createSaga(mockSagaContext, 'test-correlation-id');

      expect(result).toBeDefined();
      expect(result.correlationId).toBe('test-correlation-id');
      expect(result.state).toBe(SagaState.INITIATED);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          state: SagaState.INITIATED,
          context: mockSagaContext
        })
      );
      expect(mockRepository.logStep).toHaveBeenCalled();
    });

    it('should generate correlation ID if not provided', async () => {
      const mockSaga = new Saga(
        1,
        'generated-id',
        SagaState.INITIATED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      mockRepository.save.mockResolvedValue(mockSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.createSaga(mockSagaContext);

      expect(result).toBeDefined();
      expect(result.correlationId).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateSagaState', () => {
    it('should update saga state and persist changes', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.INITIATED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      const updatedSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.STOCK_VERIFYING,
        'Stock Verification',
        mockSagaContext,
        new Date(),
        new Date()
      );

      mockRepository.update.mockResolvedValue(updatedSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.updateSagaState(
        mockSaga,
        SagaState.STOCK_VERIFYING,
        'Stock Verification'
      );

      expect(result).toBeDefined();
      expect(result.state).toBe(SagaState.STOCK_VERIFYING);
      expect(mockRepository.update).toHaveBeenCalledWith(1, mockSaga);
      expect(mockRepository.logStep).toHaveBeenCalled();
    });

    it('should update saga context when provided', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.INITIATED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      const contextUpdate = {
        stockVerification: {
          verified: true,
          availableQuantities: { 1: 10 }
        }
      };

      const updatedSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.STOCK_VERIFYING,
        'Stock Verification',
        { ...mockSagaContext, ...contextUpdate },
        new Date(),
        new Date()
      );

      mockRepository.update.mockResolvedValue(updatedSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.updateSagaState(
        mockSaga,
        SagaState.STOCK_VERIFYING,
        'Stock Verification',
        contextUpdate
      );

      expect(result).toBeDefined();
      expect(result.state).toBe(SagaState.STOCK_VERIFYING);
      expect(result.context).toEqual(expect.objectContaining(contextUpdate));
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });

  describe('updateSagaContext', () => {
    it('should update saga context and persist changes', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.STOCK_VERIFIED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      const contextUpdate = {
        stockReservation: {
          reservationId: 'res-123',
          reservedItems: [{ productId: 1, quantity: 2 }]
        }
      };

      const updatedSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.STOCK_VERIFIED,
        null,
        { ...mockSagaContext, ...contextUpdate },
        new Date(),
        new Date()
      );

      mockRepository.update.mockResolvedValue(updatedSaga);

      const result = await stateManager.updateSagaContext(
        mockSaga,
        contextUpdate,
        'stock-reservation'
      );

      expect(result).toBeDefined();
      expect(result.context).toEqual(expect.objectContaining(contextUpdate));
      expect(mockRepository.update).toHaveBeenCalledWith(1, mockSaga);
    });
  });

  describe('completeSaga', () => {
    it('should mark saga as completed and persist final state', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.ORDER_CONFIRMING,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      const completedSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.SALE_CONFIRMED,
        null,
        mockSagaContext,
        new Date(),
        new Date(),
        new Date()
      );

      mockRepository.update.mockResolvedValue(completedSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.completeSaga(
        mockSaga,
        SagaState.SALE_CONFIRMED
      );

      expect(result).toBeDefined();
      expect(result.state).toBe(SagaState.SALE_CONFIRMED);
      expect(result.isCompleted()).toBe(true);
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.logStep).toHaveBeenCalled();
    });

    it('should set error message when saga fails', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.COMPENSATING_STOCK,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      const failedSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.COMPENSATED,
        null,
        mockSagaContext,
        new Date(),
        new Date(),
        new Date(),
        'Compensation completed'
      );

      mockRepository.update.mockResolvedValue(failedSaga);
      mockRepository.logStep.mockResolvedValue({} as SagaStep);

      const result = await stateManager.completeSaga(
        mockSaga,
        SagaState.COMPENSATED,
        'Compensation completed'
      );

      expect(result).toBeDefined();
      expect(result.state).toBe(SagaState.COMPENSATED);
      expect(result.errorMessage).toBe('Compensation completed');
      expect(result.isCompleted()).toBe(true);
    });
  });

  describe('getSagaByCorrelationId', () => {
    it('should retrieve saga by correlation ID', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.STOCK_VERIFIED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      mockRepository.findByCorrelationId.mockResolvedValue(mockSaga);

      const result = await stateManager.getSagaByCorrelationId('test-correlation-id');

      expect(result).toBeDefined();
      expect(result?.correlationId).toBe('test-correlation-id');
      expect(mockRepository.findByCorrelationId).toHaveBeenCalledWith('test-correlation-id');
    });

    it('should return null when saga not found', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);

      const result = await stateManager.getSagaByCorrelationId('non-existent-id');

      expect(result).toBeNull();
      expect(mockRepository.findByCorrelationId).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('isCorrelationIdUnique', () => {
    it('should return true when correlation ID is unique', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);

      const result = await stateManager.isCorrelationIdUnique('unique-id');

      expect(result).toBe(true);
      expect(mockRepository.findByCorrelationId).toHaveBeenCalledWith('unique-id');
    });

    it('should return false when correlation ID already exists', async () => {
      const mockSaga = new Saga(
        1,
        'existing-id',
        SagaState.INITIATED,
        null,
        mockSagaContext,
        new Date(),
        new Date()
      );

      mockRepository.findByCorrelationId.mockResolvedValue(mockSaga);

      const result = await stateManager.isCorrelationIdUnique('existing-id');

      expect(result).toBe(false);
      expect(mockRepository.findByCorrelationId).toHaveBeenCalledWith('existing-id');
    });
  });

  describe('getSagaStateHistory', () => {
    it('should retrieve saga state history', async () => {
      const mockSteps: SagaStep[] = [
        new SagaStep(1, 1, 'Saga Initialization', SagaStepState.COMPLETED, new Date()),
        new SagaStep(2, 1, 'Stock Verification', SagaStepState.COMPLETED, new Date())
      ];

      mockRepository.findStepsBySagaId.mockResolvedValue(mockSteps);

      const result = await stateManager.getSagaStateHistory(1);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].stepName).toBe('Saga Initialization');
      expect(result[1].stepName).toBe('Stock Verification');
      expect(mockRepository.findStepsBySagaId).toHaveBeenCalledWith(1);
    });
  });

  describe('getSagaMetrics', () => {
    it('should return saga metrics', async () => {
      const mockSaga = new Saga(
        1,
        'test-correlation-id',
        SagaState.SALE_CONFIRMED,
        null,
        mockSagaContext,
        new Date(Date.now() - 5000),
        new Date(),
        new Date()
      );

      const mockSteps: SagaStep[] = [
        new SagaStep(1, 1, 'Step 1', SagaStepState.COMPLETED, new Date()),
        new SagaStep(2, 1, 'Step 2', SagaStepState.COMPLETED, new Date())
      ];

      mockRepository.findByCorrelationId.mockResolvedValue(mockSaga);
      mockRepository.findStepsBySagaId.mockResolvedValue(mockSteps);

      const result = await stateManager.getSagaMetrics('test-correlation-id');

      expect(result).toBeDefined();
      expect(result?.correlationId).toBe('test-correlation-id');
      expect(result?.state).toBe(SagaState.SALE_CONFIRMED);
      expect(result?.stepCount).toBe(2);
      expect(result?.isCompleted).toBe(true);
      expect(result?.isSuccessful).toBe(true);
      expect(result?.isFailed).toBe(false);
      expect(result?.totalAmount).toBe(20.00);
      expect(result?.totalItems).toBe(2);
    });

    it('should return null when saga not found', async () => {
      mockRepository.findByCorrelationId.mockResolvedValue(null);

      const result = await stateManager.getSagaMetrics('non-existent-id');

      expect(result).toBeNull();
    });
  });
});