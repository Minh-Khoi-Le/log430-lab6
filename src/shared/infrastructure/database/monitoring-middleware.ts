import { Prisma } from '@prisma/client';
import { databaseManager } from './database-manager';
import { databaseMetrics } from './database-metrics';
import { createLogger } from '../logging';

const logger = createLogger('database-monitoring');

export interface QueryContext {
  operation: string;
  table: string;
  serviceName: string;
}

export class DatabaseMonitoringMiddleware {
  private static instance: DatabaseMonitoringMiddleware;
  
  public static getInstance(): DatabaseMonitoringMiddleware {
    if (!DatabaseMonitoringMiddleware.instance) {
      DatabaseMonitoringMiddleware.instance = new DatabaseMonitoringMiddleware();
    }
    return DatabaseMonitoringMiddleware.instance;
  }
  
  // Wrap a database operation with monitoring
  public async monitorOperation<T>(
    context: QueryContext,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      // Record successful operation
      databaseManager.recordQuery(
        context.operation,
        context.table,
        1,
        true
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      // Record failed operation
      databaseManager.recordQuery(
        context.operation,
        context.table,
        duration,
        false
      );
      // Record specific error type
      const errorType = this.categorizeError(error);
      databaseMetrics.recordQueryError(
        context.serviceName,
        context.operation,
        errorType
      );
      logger.error(`Database operation failed: ${context.operation} on ${context.table}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  // Wrap a transaction with monitoring
  public async monitorTransaction<T>(
    serviceName: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await databaseManager.executeInTransaction(operation);
      const duration = Date.now() - startTime;
      logger.info(`Transaction completed successfully`, {
        serviceName,
        duration
      });
      return result;
    } catch (error) {
      logger.error(`Transaction failed`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  // Create a monitored Prisma client wrapper
  public createMonitoredClient(serviceName: string) {
    const client = databaseManager.getClient();
    
    return new Proxy(client, {
      get: (target, prop) => {
        const originalMethod = target[prop as keyof typeof target];
        
        // If it's a model (User, Product, etc.)
        if (typeof originalMethod === 'object' && originalMethod !== null) {
          return new Proxy(originalMethod, {
            get: (modelTarget, modelProp) => {
              const modelMethod = modelTarget[modelProp as keyof typeof modelTarget];
              
              if (typeof modelMethod === 'function') {
                return (...args: any[]) => {
                  const context: QueryContext = {
                    operation: modelProp as string,
                    table: prop as string,
                    serviceName
                  };
                  
                  return this.monitorOperation(context, () => 
                    (modelMethod as Function).apply(modelTarget, args)
                  );
                };
              }
              
              return modelMethod;
            }
          });
        }
        
        return originalMethod;
      }
    });
  }
  
  private categorizeError(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return 'unknown_error';
    }
    
    const err = error as any;
    
    // Prisma-specific errors
    if (err.code) {
      switch (err.code) {
        case 'P2002':
          return 'unique_constraint_violation';
        case 'P2003':
          return 'foreign_key_constraint_violation';
        case 'P2025':
          return 'record_not_found';
        case 'P1001':
          return 'connection_refused';
        case 'P1002':
          return 'connection_timeout';
        case 'P1008':
          return 'operation_timeout';
        case 'P1017':
          return 'connection_lost';
        default:
          return `prisma_error_${err.code}`;
      }
    }
    
    // Generic database errors
    if (err.message) {
      const message = err.message.toLowerCase();
      if (message.includes('timeout')) {
        return 'timeout_error';
      } else if (message.includes('connection')) {
        return 'connection_error';
      } else if (message.includes('syntax')) {
        return 'syntax_error';
      } else if (message.includes('permission')) {
        return 'permission_error';
      }
    }
    
    return 'database_error';
  }
}

// Export singleton instance
export const databaseMonitoring = DatabaseMonitoringMiddleware.getInstance();