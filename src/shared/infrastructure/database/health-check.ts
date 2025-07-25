import { Request, Response } from 'express';
import { databaseManager } from './database-manager';
import { createLogger } from '../logging';

const logger = createLogger('database-health-check');

export interface DatabaseHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  connectionStatus: boolean;
  responseTime: number;
  metrics: {
    totalQueries: number;
    averageQueryTime: number;
    activeConnections: number;
    poolSize: number;
  };
  details?: string;
}

export class DatabaseHealthChecker {
  private static instance: DatabaseHealthChecker;
  
  public static getInstance(): DatabaseHealthChecker {
    if (!DatabaseHealthChecker.instance) {
      DatabaseHealthChecker.instance = new DatabaseHealthChecker();
    }
    return DatabaseHealthChecker.instance;
  }
  
  public async checkHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Perform health check
      const isHealthy = await databaseManager.healthCheck();
      const responseTime = Date.now() - startTime;
      const metrics = databaseManager.getConnectionMetrics();
      
      const status: DatabaseHealthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        connectionStatus: isHealthy,
        responseTime,
        metrics: {
          totalQueries: metrics.totalQueries,
          averageQueryTime: metrics.averageQueryTime,
          activeConnections: metrics.activeConnections,
          poolSize: metrics.poolSize
        }
      };
      
      // Determine if system is degraded
      if (isHealthy) {
        if (responseTime > 1000) { // Slow response
          status.status = 'degraded';
          status.details = 'Database response time is slow';
        } else if (metrics.waitingRequests > 5) { // High wait queue
          status.status = 'degraded';
          status.details = 'High number of waiting database requests';
        }
      } else {
        status.details = 'Database connection failed';
      }
      
      return status;
      
    } catch (error) {
      logger.error('Health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        connectionStatus: false,
        responseTime: Date.now() - startTime,
        metrics: {
          totalQueries: 0,
          averageQueryTime: 0,
          activeConnections: 0,
          poolSize: 0
        },
        details: `Health check error: ${(error as Error).message}`
      };
    }
  }
  
  public async checkDetailedHealth(): Promise<{
    database: DatabaseHealthStatus;
    system: {
      uptime: number;
      memory: NodeJS.MemoryUsage;
      cpu: NodeJS.CpuUsage;
    };
  }> {
    const databaseHealth = await this.checkHealth();
    
    return {
      database: databaseHealth,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }
}

// Express middleware for health check endpoint
export const healthCheckMiddleware = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthChecker = DatabaseHealthChecker.getInstance();
    const detailed = req.query.detailed === 'true';
    
    if (detailed) {
      const health = await healthChecker.checkDetailedHealth();
      let statusCode = 503;
      if (health.database.status === 'healthy' || health.database.status === 'degraded') {
        statusCode = 200;
      }
      
      res.status(statusCode).json(health);
    } else {
      const health = await healthChecker.checkHealth();
      let statusCode = 503;
      if (health.status === 'healthy' || health.status === 'degraded') {
        statusCode = 200;
      }
      
      res.status(statusCode).json(health);
    }
  } catch (error) {
    logger.error('Health check endpoint error', error as Error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error during health check'
    });
  }
};

// Simple health check for load balancers
export const simpleHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const isHealthy = await databaseManager.healthCheck();
    
    if (isHealthy) {
      res.status(200).send('OK');
    } else {
      res.status(503).send('Service Unavailable');
    }
  } catch (error) {
    logger.error('Simple health check error', error as Error);
    res.status(503).send('Service Unavailable');
  }
};

export const databaseHealthChecker = DatabaseHealthChecker.getInstance();