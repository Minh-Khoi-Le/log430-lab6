import client from 'prom-client';
import { createLogger } from '../logging';

const logger = createLogger('database-metrics');

// Database connection pool metrics
const dbConnectionPoolSize = new client.Gauge({
  name: 'db_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['service']
});

const dbConnectionPoolActive = new client.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active connections in the pool',
  labelNames: ['service']
});

const dbConnectionPoolIdle = new client.Gauge({
  name: 'db_connection_pool_idle',
  help: 'Number of idle connections in the pool',
  labelNames: ['service']
});

const dbConnectionPoolWaiting = new client.Gauge({
  name: 'db_connection_pool_waiting',
  help: 'Number of requests waiting for a connection',
  labelNames: ['service']
});

// Database operation metrics
const dbOperationsTotal = new client.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations',
  labelNames: ['service', 'operation', 'table', 'status']
});

const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['service', 'operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const dbTransactionsTotal = new client.Counter({
  name: 'db_transactions_total',
  help: 'Total number of database transactions',
  labelNames: ['service', 'status']
});

const dbTransactionDuration = new client.Histogram({
  name: 'db_transaction_duration_seconds',
  help: 'Duration of database transactions in seconds',
  labelNames: ['service'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

// Database health metrics
const dbHealthStatus = new client.Gauge({
  name: 'db_health_status',
  help: 'Database health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service']
});

const dbConnectionErrors = new client.Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['service', 'error_type']
});

const dbQueryErrors = new client.Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['service', 'operation', 'error_type']
});

// Database performance metrics
const dbSlowQueries = new client.Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow database queries (>1s)',
  labelNames: ['service', 'operation', 'table']
});

const dbRowsAffected = new client.Histogram({
  name: 'db_rows_affected',
  help: 'Number of rows affected by database operations',
  labelNames: ['service', 'operation', 'table'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000]
});

// Register all database metrics
const register = client.register;
register.registerMetric(dbConnectionPoolSize);
register.registerMetric(dbConnectionPoolActive);
register.registerMetric(dbConnectionPoolIdle);
register.registerMetric(dbConnectionPoolWaiting);
register.registerMetric(dbOperationsTotal);
register.registerMetric(dbOperationDuration);
register.registerMetric(dbTransactionsTotal);
register.registerMetric(dbTransactionDuration);
register.registerMetric(dbHealthStatus);
register.registerMetric(dbConnectionErrors);
register.registerMetric(dbQueryErrors);
register.registerMetric(dbSlowQueries);
register.registerMetric(dbRowsAffected);

export interface DatabaseMetrics {
  recordOperation(
    service: string,
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error',
    rowsAffected?: number
  ): void;
  
  recordTransaction(
    service: string,
    duration: number,
    status: 'success' | 'error'
  ): void;
  
  recordConnectionError(
    service: string,
    errorType: string
  ): void;
  
  recordQueryError(
    service: string,
    operation: string,
    errorType: string
  ): void;
  
  updateHealthStatus(
    service: string,
    isHealthy: boolean
  ): void;
  
  updateConnectionPoolMetrics(
    service: string,
    poolSize: number,
    active: number,
    idle: number,
    waiting: number
  ): void;
}

export class DatabaseMetricsCollector implements DatabaseMetrics {
  private static instance: DatabaseMetricsCollector;
  
  public static getInstance(): DatabaseMetricsCollector {
    if (!DatabaseMetricsCollector.instance) {
      DatabaseMetricsCollector.instance = new DatabaseMetricsCollector();
    }
    return DatabaseMetricsCollector.instance;
  }
  
  recordOperation(
    service: string,
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error',
    rowsAffected?: number
  ): void {
    // Record operation count
    dbOperationsTotal.inc({
      service,
      operation,
      table,
      status
    });
    
    // Record operation duration
    dbOperationDuration
      .labels(service, operation, table)
      .observe(duration);
    
    // Record slow queries (>1 second)
    if (duration > 1) {
      dbSlowQueries.inc({
        service,
        operation,
        table
      });
      logger.warn(`Slow query detected: ${operation} on ${table} took ${duration}s`, {
        service,
        operation,
        table,
        duration
      });
    }
    
    // Record rows affected if provided
    if (rowsAffected !== undefined) {
      dbRowsAffected
        .labels(service, operation, table)
        .observe(rowsAffected);
    }
  }
  
  recordTransaction(
    service: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    dbTransactionsTotal.inc({ service, status });
    dbTransactionDuration.labels(service).observe(duration);
    
    if (status === 'error') {
      logger.error(`Transaction failed for service: ${service}`);
    }
  }
  
  recordConnectionError(
    service: string,
    errorType: string
  ): void {
    dbConnectionErrors.inc({ service, error_type: errorType });
    logger.error(`Database connection error: ${errorType}`);
  }
  
  recordQueryError(
    service: string,
    operation: string,
    errorType: string
  ): void {
    dbQueryErrors.inc({ service, operation, error_type: errorType });
    logger.error(`Database query error: ${errorType}`);
  }
  
  updateHealthStatus(
    service: string,
    isHealthy: boolean
  ): void {
    dbHealthStatus.set({ service }, isHealthy ? 1 : 0);
    
    if (!isHealthy) {
      logger.error(`Database health check failed for service: ${service}`);
    }
  }
  
  updateConnectionPoolMetrics(
    service: string,
    poolSize: number,
    active: number,
    idle: number,
    waiting: number
  ): void {
    dbConnectionPoolSize.set({ service }, poolSize);
    dbConnectionPoolActive.set({ service }, active);
    dbConnectionPoolIdle.set({ service }, idle);
    dbConnectionPoolWaiting.set({ service }, waiting);
    
    // Log warning if pool is under stress
    if (waiting > 0) {
      logger.warn(`Database connection pool under stress: ${waiting} requests waiting`, {
        service,
        poolSize,
        active,
        idle,
        waiting
      });
    }
  }
}

// Export singleton instance
export const databaseMetrics = DatabaseMetricsCollector.getInstance();

// Export individual metrics for direct access if needed
export {
  dbConnectionPoolSize,
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolWaiting,
  dbOperationsTotal,
  dbOperationDuration,
  dbTransactionsTotal,
  dbTransactionDuration,
  dbHealthStatus,
  dbConnectionErrors,
  dbQueryErrors,
  dbSlowQueries,
  dbRowsAffected
};