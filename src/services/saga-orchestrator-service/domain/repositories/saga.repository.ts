import { Saga } from '../entities/saga.entity';
import { SagaStep } from '../entities/saga-step.entity';
import { SagaState } from '../enums/saga-state.enum';

/**
 * Saga Repository Interface
 * 
 * Defines the contract for saga data persistence and retrieval operations
 */
export interface ISagaRepository {
  // Basic CRUD operations
  findById(id: number): Promise<Saga | null>;
  findByCorrelationId(correlationId: string): Promise<Saga | null>;
  save(saga: Omit<Saga, 'id'>): Promise<Saga>;
  update(id: number, saga: Partial<Saga>): Promise<Saga>;
  delete(id: number): Promise<void>;

  // Query operations
  findByState(state: SagaState): Promise<Saga[]>;
  findByStates(states: SagaState[]): Promise<Saga[]>;
  findByUserId(userId: number): Promise<Saga[]>;
  findByStoreId(storeId: number): Promise<Saga[]>;
  findActiveByUserId(userId: number): Promise<Saga[]>;
  findCompletedSagas(limit?: number): Promise<Saga[]>;
  findFailedSagas(limit?: number): Promise<Saga[]>;
  
  // Time-based queries
  findSagasCreatedAfter(date: Date): Promise<Saga[]>;
  findSagasCreatedBefore(date: Date): Promise<Saga[]>;
  findSagasCreatedBetween(startDate: Date, endDate: Date): Promise<Saga[]>;
  findSagasCompletedBetween(startDate: Date, endDate: Date): Promise<Saga[]>;
  
  // Pagination support
  findWithPagination(
    page?: number,
    limit?: number,
    filters?: {
      state?: SagaState;
      states?: SagaState[];
      userId?: number;
      storeId?: number;
      createdAfter?: Date;
      createdBefore?: Date;
    },
    orderBy?: {
      field: 'createdAt' | 'updatedAt' | 'completedAt';
      direction: 'asc' | 'desc';
    }
  ): Promise<{
    data: Saga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  // Step logging operations
  logStep(step: Omit<SagaStep, 'id'>): Promise<SagaStep>;
  updateStep(stepId: number, step: Partial<SagaStep>): Promise<SagaStep>;
  findStepsBySagaId(sagaId: number): Promise<SagaStep[]>;
  findStepsByName(stepName: string): Promise<SagaStep[]>;
  findFailedSteps(limit?: number): Promise<SagaStep[]>;
  
  // Metrics and monitoring operations
  recordMetric(
    sagaId: number,
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void>;
  
  getSuccessRate(timeRange?: { start: Date; end: Date }): Promise<number>;
  getAverageDuration(timeRange?: { start: Date; end: Date }): Promise<number>;
  getFailuresByType(timeRange?: { start: Date; end: Date }): Promise<Record<string, number>>;
  getStepPerformanceMetrics(
    stepName?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    stepName: string;
    averageDuration: number;
    successRate: number;
    totalExecutions: number;
  }[]>;
  
  // Cleanup operations
  deleteCompletedSagasOlderThan(date: Date): Promise<number>;
  deleteFailedSagasOlderThan(date: Date): Promise<number>;
  deleteStepLogsOlderThan(date: Date): Promise<number>;
  
  // Transaction support - use saga-specific method
  executeInSagaTransaction<T>(operation: (repository: ISagaRepository) => Promise<T>): Promise<T>;
  
  // Health check
  healthCheck(): Promise<boolean>;
  
  // Connection metrics
  getConnectionMetrics(): {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    errorRate: number;
  };
}