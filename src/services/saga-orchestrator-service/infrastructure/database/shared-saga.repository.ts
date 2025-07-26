import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../../shared/infrastructure/database/base-repository';
import { IDatabaseManager, databaseManager } from '../../../../shared/infrastructure/database/database-manager';
import { createLogger } from '../../../../shared/infrastructure/logging';
import { Saga } from '../../domain/entities/saga.entity';
import { SagaStep, SagaStepState } from '../../domain/entities/saga-step.entity';
import { SagaState } from '../../domain/enums/saga-state.enum';
import { SagaContext } from '../../domain/entities/saga-context.interface';
import { ISagaRepository } from '../../domain/repositories/saga.repository';

const logger = createLogger('shared-saga-repository');

// Helper interface for database manager with recordQuery method
interface DatabaseManagerWithMetrics extends IDatabaseManager {
  recordQuery(operation: string, table: string, duration: number, success: boolean, rowsAffected?: number): void;
}

/**
 * Shared Saga Repository Implementation
 * 
 * Implements the ISagaRepository interface using the shared database manager pattern.
 * Provides comprehensive saga and step logging operations with proper error handling,
 * transaction support, and metrics recording.
 */
export class SharedSagaRepository extends BaseRepository<Saga, number> implements ISagaRepository {
  
  constructor(databaseManager: IDatabaseManager) {
    super(databaseManager, 'saga');
  }

  // Helper method to safely record query metrics
  private recordQuery(operation: string, table: string, duration: number, success: boolean, rowsAffected?: number): void {
    if ('recordQuery' in this.databaseManager) {
      (this.databaseManager as DatabaseManagerWithMetrics).recordQuery(operation, table, duration, success, rowsAffected);
    }
  }

  // Basic CRUD operations

  async findByCorrelationId(correlationId: string): Promise<Saga | null> {
    try {
      const startTime = Date.now();
      logger.info('Finding saga by correlation ID', { correlationId });

      const result = await this.prisma.saga.findUnique({
        where: { correlationId },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findUnique', 'saga', duration, true);

      if (!result) {
        logger.info('Saga not found by correlation ID', { correlationId });
        return null;
      }

      const saga = this.mapPrismaToSaga(result);
      logger.info('Found saga by correlation ID', { 
        correlationId, 
        sagaId: saga.id,
        state: saga.state 
      });

      return saga;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findUnique', 'saga', duration, false);
      logger.error('Error finding saga by correlation ID', error as Error, { correlationId });
      throw error;
    }
  }

  async save(sagaData: Omit<Saga, 'id'>): Promise<Saga> {
    try {
      const startTime = Date.now();
      logger.info('Creating new saga', { 
        correlationId: sagaData.correlationId,
        state: sagaData.state 
      });

      const result = await this.prisma.saga.create({
        data: {
          correlationId: sagaData.correlationId,
          state: sagaData.state,
          currentStep: sagaData.currentStep,
          context: sagaData.context as any,
          createdAt: sagaData.createdAt,
          updatedAt: sagaData.updatedAt,
          completedAt: sagaData.completedAt,
          errorMessage: sagaData.errorMessage,
          compensationData: sagaData.compensationData as any
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('create', 'saga', duration, true, 1);

      const saga = this.mapPrismaToSaga(result);
      logger.info('Created new saga', { 
        sagaId: saga.id,
        correlationId: saga.correlationId,
        state: saga.state 
      });

      return saga;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('create', 'saga', duration, false);
      logger.error('Error creating saga', error as Error, { 
        correlationId: sagaData.correlationId 
      });
      throw error;
    }
  }

  async update(id: number, sagaData: Partial<Saga>): Promise<Saga> {
    try {
      const startTime = Date.now();
      logger.info('Updating saga', { sagaId: id, updates: Object.keys(sagaData) });

      const updateData: any = {};
      if (sagaData.state !== undefined) updateData.state = sagaData.state;
      if (sagaData.currentStep !== undefined) updateData.currentStep = sagaData.currentStep;
      if (sagaData.context !== undefined) updateData.context = sagaData.context as any;
      if (sagaData.updatedAt !== undefined) updateData.updatedAt = sagaData.updatedAt;
      if (sagaData.completedAt !== undefined) updateData.completedAt = sagaData.completedAt;
      if (sagaData.errorMessage !== undefined) updateData.errorMessage = sagaData.errorMessage;
      if (sagaData.compensationData !== undefined) updateData.compensationData = sagaData.compensationData as any;

      const result = await this.prisma.saga.update({
        where: { id },
        data: updateData,
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('update', 'saga', duration, true, 1);

      const saga = this.mapPrismaToSaga(result);
      logger.info('Updated saga', { 
        sagaId: saga.id,
        correlationId: saga.correlationId,
        state: saga.state 
      });

      return saga;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('update', 'saga', duration, false);
      logger.error('Error updating saga', error as Error, { sagaId: id });
      throw error;
    }
  }

  // Query operations

  async findByState(state: SagaState): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas by state', { state });

      const results = await this.prisma.saga.findMany({
        where: { state },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas by state', { state, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas by state', error as Error, { state });
      throw error;
    }
  }

  async findByStates(states: SagaState[]): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas by states', { states });

      const results = await this.prisma.saga.findMany({
        where: { 
          state: { in: states } 
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas by states', { states, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas by states', error as Error, { states });
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas by user ID', { userId });

      const results = await this.prisma.saga.findMany({
        where: {
          context: {
            path: ['saleRequest', 'userId'],
            equals: userId
          }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas by user ID', { userId, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas by user ID', error as Error, { userId });
      throw error;
    }
  }

  async findByStoreId(storeId: number): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas by store ID', { storeId });

      const results = await this.prisma.saga.findMany({
        where: {
          context: {
            path: ['saleRequest', 'storeId'],
            equals: storeId
          }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas by store ID', { storeId, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas by store ID', error as Error, { storeId });
      throw error;
    }
  }

  async findActiveByUserId(userId: number): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding active sagas by user ID', { userId });

      const activeStates = [
        SagaState.INITIATED,
        SagaState.STOCK_VERIFYING,
        SagaState.STOCK_VERIFIED,
        SagaState.STOCK_RESERVING,
        SagaState.STOCK_RESERVED,
        SagaState.PAYMENT_PROCESSING,
        SagaState.PAYMENT_PROCESSED,
        SagaState.ORDER_CONFIRMING,
        SagaState.COMPENSATING_STOCK,
        SagaState.COMPENSATING_PAYMENT
      ];

      const results = await this.prisma.saga.findMany({
        where: {
          AND: [
            {
              context: {
                path: ['saleRequest', 'userId'],
                equals: userId
              }
            },
            {
              state: { in: activeStates }
            }
          ]
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found active sagas by user ID', { userId, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding active sagas by user ID', error as Error, { userId });
      throw error;
    }
  }

  async findCompletedSagas(limit: number = 100): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding completed sagas', { limit });

      const completedStates = [
        SagaState.SALE_CONFIRMED,
        SagaState.COMPENSATED,
        SagaState.FAILED,
        SagaState.STOCK_VERIFICATION_FAILED,
        SagaState.STOCK_RESERVATION_FAILED
      ];

      const results = await this.prisma.saga.findMany({
        where: {
          state: { in: completedStates }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: limit
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found completed sagas', { count: sagas.length, limit });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding completed sagas', error as Error, { limit });
      throw error;
    }
  }

  async findFailedSagas(limit: number = 100): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding failed sagas', { limit });

      const failedStates = [
        SagaState.STOCK_VERIFICATION_FAILED,
        SagaState.STOCK_RESERVATION_FAILED,
        SagaState.PAYMENT_FAILED,
        SagaState.ORDER_CONFIRMATION_FAILED,
        SagaState.FAILED
      ];

      const results = await this.prisma.saga.findMany({
        where: {
          state: { in: failedStates }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found failed sagas', { count: sagas.length, limit });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding failed sagas', error as Error, { limit });
      throw error;
    }
  }

  // Time-based queries

  async findSagasCreatedAfter(date: Date): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas created after date', { date });

      const results = await this.prisma.saga.findMany({
        where: {
          createdAt: { gte: date }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas created after date', { date, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas created after date', error as Error, { date });
      throw error;
    }
  }

  async findSagasCreatedBefore(date: Date): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas created before date', { date });

      const results = await this.prisma.saga.findMany({
        where: {
          createdAt: { lte: date }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas created before date', { date, count: sagas.length });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas created before date', error as Error, { date });
      throw error;
    }
  }

  async findSagasCreatedBetween(startDate: Date, endDate: Date): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas created between dates', { startDate, endDate });

      const results = await this.prisma.saga.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas created between dates', { 
        startDate, 
        endDate, 
        count: sagas.length 
      });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas created between dates', error as Error, { 
        startDate, 
        endDate 
      });
      throw error;
    }
  }

  async findSagasCompletedBetween(startDate: Date, endDate: Date): Promise<Saga[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding sagas completed between dates', { startDate, endDate });

      const results = await this.prisma.saga.findMany({
        where: {
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          stepLogs: {
            orderBy: { startedAt: 'asc' }
          }
        },
        orderBy: { completedAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, results.length);

      const sagas = results.map(result => this.mapPrismaToSaga(result));
      logger.info('Found sagas completed between dates', { 
        startDate, 
        endDate, 
        count: sagas.length 
      });

      return sagas;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas completed between dates', error as Error, { 
        startDate, 
        endDate 
      });
      throw error;
    }
  }

  // Pagination support

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
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
  }> {
    try {
      const startTime = Date.now();
      const skip = (page - 1) * limit;

      logger.info('Finding sagas with pagination', { 
        page, 
        limit, 
        skip, 
        filters, 
        orderBy 
      });

      // Build where clause
      const where: any = {};
      
      if (filters?.state) {
        where.state = filters.state;
      }
      
      if (filters?.states) {
        where.state = { in: filters.states };
      }
      
      if (filters?.userId) {
        where.context = {
          path: ['saleRequest', 'userId'],
          equals: filters.userId
        };
      }
      
      if (filters?.storeId) {
        where.context = {
          ...where.context,
          path: ['saleRequest', 'storeId'],
          equals: filters.storeId
        };
      }
      
      if (filters?.createdAfter || filters?.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) {
          where.createdAt.gte = filters.createdAfter;
        }
        if (filters.createdBefore) {
          where.createdAt.lte = filters.createdBefore;
        }
      }

      // Build order by clause
      const orderByClause: any = {};
      if (orderBy) {
        orderByClause[orderBy.field] = orderBy.direction;
      } else {
        orderByClause.createdAt = 'desc';
      }

      const [data, total] = await Promise.all([
        this.prisma.saga.findMany({
          where,
          include: {
            stepLogs: {
              orderBy: { startedAt: 'asc' }
            }
          },
          orderBy: orderByClause,
          skip,
          take: limit
        }),
        this.prisma.saga.count({ where })
      ]);

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, data.length);

      const sagas = data.map(result => this.mapPrismaToSaga(result));
      const totalPages = Math.ceil(total / limit);

      logger.info('Found sagas with pagination', {
        count: sagas.length,
        total,
        page,
        totalPages
      });

      return {
        data: sagas,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error finding sagas with pagination', error as Error, { 
        page, 
        limit, 
        filters 
      });
      throw error;
    }
  }

  // Step logging operations

  async logStep(stepData: Omit<SagaStep, 'id'>): Promise<SagaStep> {
    try {
      const startTime = Date.now();
      logger.info('Logging saga step', { 
        sagaId: stepData.sagaId,
        stepName: stepData.stepName,
        state: stepData.state 
      });

      const result = await this.prisma.sagaStepLog.create({
        data: {
          sagaId: stepData.sagaId,
          stepName: stepData.stepName,
          state: stepData.state,
          startedAt: stepData.startedAt,
          completedAt: stepData.completedAt,
          duration: stepData.duration,
          success: stepData.success,
          errorMessage: stepData.errorMessage,
          stepData: stepData.stepData as any
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('create', 'sagaStepLog', duration, true, 1);

      const step = this.mapPrismaToSagaStep(result);
      logger.info('Logged saga step', { 
        stepId: step.id,
        sagaId: step.sagaId,
        stepName: step.stepName 
      });

      return step;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('create', 'sagaStepLog', duration, false);
      logger.error('Error logging saga step', error as Error, { 
        sagaId: stepData.sagaId,
        stepName: stepData.stepName 
      });
      throw error;
    }
  }

  async updateStep(stepId: number, stepData: Partial<SagaStep>): Promise<SagaStep> {
    try {
      const startTime = Date.now();
      logger.info('Updating saga step', { stepId, updates: Object.keys(stepData) });

      const updateData: any = {};
      if (stepData.state !== undefined) updateData.state = stepData.state;
      if (stepData.completedAt !== undefined) updateData.completedAt = stepData.completedAt;
      if (stepData.duration !== undefined) updateData.duration = stepData.duration;
      if (stepData.success !== undefined) updateData.success = stepData.success;
      if (stepData.errorMessage !== undefined) updateData.errorMessage = stepData.errorMessage;
      if (stepData.stepData !== undefined) updateData.stepData = stepData.stepData as any;

      const result = await this.prisma.sagaStepLog.update({
        where: { id: stepId },
        data: updateData
      });

      const duration = Date.now() - startTime;
      this.recordQuery('update', 'sagaStepLog', duration, true, 1);

      const step = this.mapPrismaToSagaStep(result);
      logger.info('Updated saga step', { 
        stepId: step.id,
        sagaId: step.sagaId,
        stepName: step.stepName 
      });

      return step;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('update', 'sagaStepLog', duration, false);
      logger.error('Error updating saga step', error as Error, { stepId });
      throw error;
    }
  }

  async findStepsBySagaId(sagaId: number): Promise<SagaStep[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding steps by saga ID', { sagaId });

      const results = await this.prisma.sagaStepLog.findMany({
        where: { sagaId },
        orderBy: { startedAt: 'asc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'sagaStepLog', duration, true, results.length);

      const steps = results.map(result => this.mapPrismaToSagaStep(result));
      logger.info('Found steps by saga ID', { sagaId, count: steps.length });

      return steps;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'sagaStepLog', duration, false);
      logger.error('Error finding steps by saga ID', error as Error, { sagaId });
      throw error;
    }
  }

  async findStepsByName(stepName: string): Promise<SagaStep[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding steps by name', { stepName });

      const results = await this.prisma.sagaStepLog.findMany({
        where: { stepName },
        orderBy: { startedAt: 'desc' }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'sagaStepLog', duration, true, results.length);

      const steps = results.map(result => this.mapPrismaToSagaStep(result));
      logger.info('Found steps by name', { stepName, count: steps.length });

      return steps;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'sagaStepLog', duration, false);
      logger.error('Error finding steps by name', error as Error, { stepName });
      throw error;
    }
  }

  async findFailedSteps(limit: number = 100): Promise<SagaStep[]> {
    try {
      const startTime = Date.now();
      logger.info('Finding failed steps', { limit });

      const results = await this.prisma.sagaStepLog.findMany({
        where: { 
          success: false 
        },
        orderBy: { startedAt: 'desc' },
        take: limit
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'sagaStepLog', duration, true, results.length);

      const steps = results.map(result => this.mapPrismaToSagaStep(result));
      logger.info('Found failed steps', { count: steps.length, limit });

      return steps;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'sagaStepLog', duration, false);
      logger.error('Error finding failed steps', error as Error, { limit });
      throw error;
    }
  }

  // Metrics and monitoring operations

  async recordMetric(
    sagaId: number,
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    try {
      logger.info('Recording saga metric', { sagaId, metricName, value, labels });
      
      // In a real implementation, this would record to a metrics store
      // For now, we'll log it for monitoring purposes
      logger.info('Saga metric recorded', {
        sagaId,
        metricName,
        value,
        labels,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error recording saga metric', error as Error, { 
        sagaId, 
        metricName, 
        value 
      });
      throw error;
    }
  }

  async getSuccessRate(timeRange?: { start: Date; end: Date }): Promise<number> {
    try {
      const startTime = Date.now();
      logger.info('Getting saga success rate', { timeRange });

      const where: any = {};
      if (timeRange) {
        where.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const [totalCount, successCount] = await Promise.all([
        this.prisma.saga.count({ where }),
        this.prisma.saga.count({
          where: {
            ...where,
            state: SagaState.SALE_CONFIRMED
          }
        })
      ]);

      const duration = Date.now() - startTime;
      this.recordQuery('count', 'saga', duration, true);

      const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;
      logger.info('Calculated saga success rate', { 
        totalCount, 
        successCount, 
        successRate 
      });

      return successRate;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('count', 'saga', duration, false);
      logger.error('Error getting saga success rate', error as Error, { timeRange });
      throw error;
    }
  }

  async getAverageDuration(timeRange?: { start: Date; end: Date }): Promise<number> {
    try {
      const startTime = Date.now();
      logger.info('Getting average saga duration', { timeRange });

      const where: any = {
        completedAt: { not: null }
      };
      
      if (timeRange) {
        where.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const sagas = await this.prisma.saga.findMany({
        where,
        select: {
          createdAt: true,
          completedAt: true
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('findMany', 'saga', duration, true, sagas.length);

      if (sagas.length === 0) {
        logger.info('No completed sagas found for duration calculation');
        return 0;
      }

      const totalDuration = sagas.reduce((sum, saga) => {
        if (saga.completedAt) {
          return sum + (saga.completedAt.getTime() - saga.createdAt.getTime());
        }
        return sum;
      }, 0);

      const averageDuration = totalDuration / sagas.length;
      logger.info('Calculated average saga duration', { 
        count: sagas.length, 
        averageDuration 
      });

      return averageDuration;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('findMany', 'saga', duration, false);
      logger.error('Error getting average saga duration', error as Error, { timeRange });
      throw error;
    }
  }

  async getFailuresByType(timeRange?: { start: Date; end: Date }): Promise<Record<string, number>> {
    try {
      const startTime = Date.now();
      logger.info('Getting failures by type', { timeRange });

      const where: any = {
        state: {
          in: [
            SagaState.STOCK_VERIFICATION_FAILED,
            SagaState.STOCK_RESERVATION_FAILED,
            SagaState.PAYMENT_FAILED,
            SagaState.ORDER_CONFIRMATION_FAILED,
            SagaState.FAILED
          ]
        }
      };
      
      if (timeRange) {
        where.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const results = await this.prisma.saga.groupBy({
        by: ['state'],
        where,
        _count: {
          state: true
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('groupBy', 'saga', duration, true, results.length);

      const failuresByType: Record<string, number> = {};
      results.forEach(result => {
        failuresByType[result.state] = result._count.state;
      });

      logger.info('Got failures by type', { failuresByType });
      return failuresByType;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('groupBy', 'saga', duration, false);
      logger.error('Error getting failures by type', error as Error, { timeRange });
      throw error;
    }
  }

  async getStepPerformanceMetrics(
    stepName?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    stepName: string;
    averageDuration: number;
    successRate: number;
    totalExecutions: number;
  }[]> {
    try {
      const startTime = Date.now();
      logger.info('Getting step performance metrics', { stepName, timeRange });

      const where: any = {};
      if (stepName) {
        where.stepName = stepName;
      }
      if (timeRange) {
        where.startedAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const results = await this.prisma.sagaStepLog.groupBy({
        by: ['stepName'],
        where,
        _count: {
          stepName: true
        },
        _avg: {
          duration: true
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('groupBy', 'sagaStepLog', duration, true, results.length);

      const metrics = await Promise.all(
        results.map(async (result) => {
          const successCount = await this.prisma.sagaStepLog.count({
            where: {
              ...where,
              stepName: result.stepName,
              success: true
            }
          });

          return {
            stepName: result.stepName,
            averageDuration: result._avg.duration || 0,
            successRate: result._count.stepName > 0 ? (successCount / result._count.stepName) * 100 : 0,
            totalExecutions: result._count.stepName
          };
        })
      );

      logger.info('Got step performance metrics', { count: metrics.length });
      return metrics;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('groupBy', 'sagaStepLog', duration, false);
      logger.error('Error getting step performance metrics', error as Error, { 
        stepName, 
        timeRange 
      });
      throw error;
    }
  }

  // Cleanup operations

  async deleteCompletedSagasOlderThan(date: Date): Promise<number> {
    try {
      const startTime = Date.now();
      logger.info('Deleting completed sagas older than date', { date });

      const completedStates = [
        SagaState.SALE_CONFIRMED,
        SagaState.COMPENSATED,
        SagaState.FAILED,
        SagaState.STOCK_VERIFICATION_FAILED,
        SagaState.STOCK_RESERVATION_FAILED
      ];

      const result = await this.prisma.saga.deleteMany({
        where: {
          AND: [
            { state: { in: completedStates } },
            { completedAt: { lte: date } }
          ]
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('deleteMany', 'saga', duration, true, result.count);

      logger.info('Deleted completed sagas older than date', { 
        date, 
        deletedCount: result.count 
      });

      return result.count;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('deleteMany', 'saga', duration, false);
      logger.error('Error deleting completed sagas older than date', error as Error, { date });
      throw error;
    }
  }

  async deleteFailedSagasOlderThan(date: Date): Promise<number> {
    try {
      const startTime = Date.now();
      logger.info('Deleting failed sagas older than date', { date });

      const failedStates = [
        SagaState.STOCK_VERIFICATION_FAILED,
        SagaState.STOCK_RESERVATION_FAILED,
        SagaState.PAYMENT_FAILED,
        SagaState.ORDER_CONFIRMATION_FAILED,
        SagaState.FAILED
      ];

      const result = await this.prisma.saga.deleteMany({
        where: {
          AND: [
            { state: { in: failedStates } },
            { updatedAt: { lte: date } }
          ]
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('deleteMany', 'saga', duration, true, result.count);

      logger.info('Deleted failed sagas older than date', { 
        date, 
        deletedCount: result.count 
      });

      return result.count;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('deleteMany', 'saga', duration, false);
      logger.error('Error deleting failed sagas older than date', error as Error, { date });
      throw error;
    }
  }

  async deleteStepLogsOlderThan(date: Date): Promise<number> {
    try {
      const startTime = Date.now();
      logger.info('Deleting step logs older than date', { date });

      const result = await this.prisma.sagaStepLog.deleteMany({
        where: {
          startedAt: { lte: date }
        }
      });

      const duration = Date.now() - startTime;
      this.recordQuery('deleteMany', 'sagaStepLog', duration, true, result.count);

      logger.info('Deleted step logs older than date', { 
        date, 
        deletedCount: result.count 
      });

      return result.count;
    } catch (error) {
      const duration = Date.now() - Date.now();
      this.recordQuery('deleteMany', 'sagaStepLog', duration, false);
      logger.error('Error deleting step logs older than date', error as Error, { date });
      throw error;
    }
  }

  // Transaction support with saga-specific signature
  async executeInSagaTransaction<T>(operation: (repository: ISagaRepository) => Promise<T>): Promise<T> {
    return this.databaseManager.executeInTransaction(async (tx) => {
      // Create a new repository instance that uses the transaction client
      const transactionalRepo = new SharedSagaRepository(this.databaseManager);
      // Override the prisma client with the transaction client
      (transactionalRepo as any).prisma = tx;
      
      return operation(transactionalRepo);
    });
  }



  // Health check

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.saga.findFirst({
        take: 1
      });
      return true;
    } catch (error) {
      logger.error('Saga repository health check failed', error as Error);
      return false;
    }
  }

  // Connection metrics

  getConnectionMetrics(): {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    errorRate: number;
  } {
    const baseMetrics = this.databaseManager.getConnectionMetrics();
    return {
      activeConnections: baseMetrics.activeConnections,
      totalQueries: baseMetrics.totalQueries,
      averageQueryTime: baseMetrics.averageQueryTime,
      errorRate: 0 // Default error rate since it's not in base metrics
    };
  }

  // Private helper methods

  private mapPrismaToSaga(prismaResult: any): Saga {
    return new Saga(
      prismaResult.id,
      prismaResult.correlationId,
      prismaResult.state as SagaState,
      prismaResult.currentStep,
      prismaResult.context as SagaContext,
      prismaResult.createdAt,
      prismaResult.updatedAt,
      prismaResult.completedAt,
      prismaResult.errorMessage,
      prismaResult.compensationData
    );
  }

  private mapPrismaToSagaStep(prismaResult: any): SagaStep {
    return new SagaStep(
      prismaResult.id,
      prismaResult.sagaId,
      prismaResult.stepName,
      prismaResult.state as SagaStepState,
      prismaResult.startedAt,
      prismaResult.completedAt,
      prismaResult.duration,
      prismaResult.success,
      prismaResult.errorMessage,
      prismaResult.stepData
    );
  }
}

// Export singleton instance using the shared database manager
export const sharedSagaRepository = new SharedSagaRepository(databaseManager);