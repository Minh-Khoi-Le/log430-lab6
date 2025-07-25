import { PrismaClient, Prisma } from '@prisma/client';
import { createLogger } from '../logging';
import { databaseMetrics } from './database-metrics';

const logger = createLogger('database-manager');

export interface IDatabaseManager {
  getClient(): PrismaClient;
  beginTransaction(): Promise<Prisma.TransactionClient>;
  executeInTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  healthCheck(): Promise<boolean>;
  getConnectionMetrics(): ConnectionMetrics;
  startMonitoring(serviceName: string): void;
  stopMonitoring(): void;
}

export interface ConnectionMetrics {
  poolSize: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  averageQueryTime: number;
}

export class DatabaseManager implements IDatabaseManager {
  private static instance: DatabaseManager;
  private readonly prismaClient: PrismaClient;
  private connected: boolean = false;
  private serviceName: string = 'unknown';
  private monitoringInterval?: NodeJS.Timeout;
  private queryCount: number = 0;
  private totalQueryTime: number = 0;
  private connectionPoolMetrics: ConnectionMetrics = {
    poolSize: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalQueries: 0,
    averageQueryTime: 0
  };

  private constructor() {
    this.prismaClient = new PrismaClient({
      log: [
        { level: 'query', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Connection will be initialized when needed
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await this.prismaClient.$connect();
      this.connected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      this.connected = false;
      logger.error('Failed to establish database connection', error as Error);
      throw error;
    }
  }

  public getClient(): PrismaClient {
    if (!this.connected) {
      logger.warn('Database connection not established, attempting to reconnect');
      // Don't throw immediately, let Prisma handle connection retry
    }
    return this.prismaClient;
  }

  public async beginTransaction(): Promise<Prisma.TransactionClient> {
    throw new Error('beginTransaction() is deprecated. Use executeInTransaction() instead for proper transaction management.');
  }

  public async executeInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    if (!this.connected) {
      throw new Error('Database is not connected');
    }

    const startTime = Date.now();
    try {
      logger.info('Starting database transaction');
      const result = await this.prismaClient.$transaction(operation, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      });
      
      const duration = (Date.now() - startTime) / 1000;
      databaseMetrics.recordTransaction(this.serviceName, duration, 'success');
      logger.info('Database transaction completed successfully');
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      databaseMetrics.recordTransaction(this.serviceName, duration, 'error');
      logger.error('Database transaction failed', error as Error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prismaClient.$disconnect();
      this.connected = false;
      logger.info('Database connection closed successfully');
    } catch (error) {
      logger.error('Error disconnecting from database', error as Error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.prismaClient.$queryRaw`SELECT 1`;
      const duration = (Date.now() - startTime) / 1000;
      
      // Record health check metrics
      databaseMetrics.recordOperation(
        this.serviceName,
        'health_check',
        'system',
        duration,
        'success'
      );
      databaseMetrics.updateHealthStatus(this.serviceName, true);
      
      return true;
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      databaseMetrics.recordConnectionError(this.serviceName, 'health_check_failed');
      databaseMetrics.updateHealthStatus(this.serviceName, false);
      return false;
    }
  }

  // Connection retry logic
  public async reconnect(): Promise<void> {
    try {
      logger.info('Attempting to reconnect to database');
      if (this.connected) {
        await this.disconnect();
      }
      await this.initialize();
      logger.info('Database reconnection successful');
    } catch (error) {
      logger.error('Database reconnection failed', error as Error);
      throw error;
    }
  }

  // Ensure connection is established before operations
  public async ensureConnection(): Promise<void> {
    if (!this.connected) {
      await this.initialize();
    }
  }

  // Get connection metrics
  public getConnectionMetrics(): ConnectionMetrics {
    return {
      ...this.connectionPoolMetrics,
      totalQueries: this.queryCount,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0
    };
  }

  // Start monitoring database metrics
  public startMonitoring(serviceName: string): void {
    this.serviceName = serviceName;
    
    // Stop existing monitoring if running
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // Start periodic health checks and metrics collection
    this.monitoringInterval = setInterval(async () => {
      try {
        // Perform health check
        await this.healthCheck();
        
        // Update connection pool metrics (simulated since Prisma doesn't expose pool stats directly)
        // In a real implementation, you would get these from the database or connection pool
        this.updateConnectionPoolMetrics();
        
        // Update metrics in Prometheus
        databaseMetrics.updateConnectionPoolMetrics(
          this.serviceName,
          this.connectionPoolMetrics.poolSize,
          this.connectionPoolMetrics.activeConnections,
          this.connectionPoolMetrics.idleConnections,
          this.connectionPoolMetrics.waitingRequests
        );
        
      } catch (error) {
        logger.error('Error during database monitoring', error as Error);
        databaseMetrics.recordConnectionError(this.serviceName, 'monitoring_error');
      }
    }, 30000); // Every 30 seconds

    logger.info(`Database monitoring started for service: ${serviceName}`);
  }

  // Stop monitoring
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info(`Database monitoring stopped for service: ${this.serviceName}`);
    }
  }

  // Update connection pool metrics (simulated)
  private updateConnectionPoolMetrics(): void {
    // Since Prisma doesn't expose connection pool metrics directly,
    // we simulate reasonable values based on connection state
    this.connectionPoolMetrics = {
      poolSize: 10, // Default Prisma pool size
      activeConnections: this.connected ? Math.floor(Math.random() * 5) + 1 : 0,
      idleConnections: this.connected ? Math.floor(Math.random() * 5) + 1 : 0,
      waitingRequests: Math.floor(Math.random() * 2), // Usually 0-1
      totalQueries: this.queryCount,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0
    };
  }

  // Method to record query metrics (to be called by repositories)
  public recordQuery(operation: string, table: string, duration: number, success: boolean, rowsAffected?: number): void {
    this.queryCount++;
    this.totalQueryTime += duration;
    
    databaseMetrics.recordOperation(
      this.serviceName,
      operation,
      table,
      duration,
      success ? 'success' : 'error',
      rowsAffected
    );
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();