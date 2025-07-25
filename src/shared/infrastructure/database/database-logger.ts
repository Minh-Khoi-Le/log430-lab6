import { createLogger } from '../logging';
import { databaseMetrics } from './database-metrics';

const logger = createLogger('database-operations');

export interface DatabaseLogContext {
  serviceName: string;
  operation: string;
  table: string;
  duration: number;
  success: boolean;
  rowsAffected?: number;
  query?: string;
  parameters?: any[];
  error?: Error;
}

export class DatabaseLogger {
  private static instance: DatabaseLogger;
  
  public static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }
  
  public logOperation(context: DatabaseLogContext): void {
    const logData = {
      service: context.serviceName,
      operation: context.operation,
      table: context.table,
      duration: context.duration,
      success: context.success,
      rowsAffected: context.rowsAffected,
      timestamp: new Date().toISOString()
    };
    
    if (context.success) {
      if (context.duration > 1) {
        // Log slow queries as warnings
        logger.warn('Slow database operation detected', {
          ...logData,
          query: context.query?.substring(0, 200), // Truncate long queries
          threshold: '1s'
        });
      } else {
        logger.info('Database operation completed', logData);
      }
    } else {
      logger.error('Database operation failed', context.error instanceof Error ? context.error : new Error(String(context.error)));
    }
  }
  
  public logTransaction(
    serviceName: string,
    duration: number,
    success: boolean,
    operationCount?: number,
    error?: Error
  ): void {
    const logData = {
      service: serviceName,
      type: 'transaction',
      duration,
      success,
      operationCount,
      timestamp: new Date().toISOString()
    };
    
    if (success) {
      if (duration > 5) {
        logger.warn('Long-running transaction detected', {
          ...logData,
          threshold: '5s'
        });
      } else {
        logger.info('Transaction completed successfully', logData);
      }
    } else {
      logger.error('Transaction failed', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  public logConnectionEvent(
    serviceName: string,
    event: 'connect' | 'disconnect' | 'reconnect' | 'error',
    details?: string,
    error?: Error
  ): void {
    const logData = {
      service: serviceName,
      event,
      details,
      timestamp: new Date().toISOString()
    };
    
    switch (event) {
      case 'connect':
        logger.info('Database connection established', logData);
        break;
      case 'disconnect':
        logger.info('Database connection closed', logData);
        break;
      case 'reconnect':
        logger.warn('Database reconnection attempt', logData);
        break;
      case 'error':
        logger.error('Database connection error', error instanceof Error ? error : new Error(String(error)));
        break;
    }
  }
  
  public logHealthCheck(
    serviceName: string,
    success: boolean,
    responseTime: number,
    details?: string
  ): void {
    const logData = {
      service: serviceName,
      type: 'health_check',
      success,
      responseTime,
      details,
      timestamp: new Date().toISOString()
    };
    
    if (success) {
      if (responseTime > 1000) {
        logger.warn('Slow health check response', {
          ...logData,
          threshold: '1000ms'
        });
      } else {
        logger.info('Health check passed', logData);
      }
    } else {
      logger.error('Health check failed', new Error(`Health check failed for service: ${serviceName}`));
    }
  }
  
  public logPerformanceAlert(
    serviceName: string,
    alertType: 'slow_query' | 'high_connection_usage' | 'transaction_timeout' | 'connection_pool_exhausted',
    details: Record<string, any>
  ): void {
    logger.warn(`Database performance alert: ${alertType}`, {
      service: serviceName,
      alertType,
      ...details,
      timestamp: new Date().toISOString()
    });
    
    // Also record as metric for alerting
    databaseMetrics.recordQueryError(serviceName, 'performance_alert', alertType);
  }
}

// Export singleton instance
export const databaseLogger = DatabaseLogger.getInstance();