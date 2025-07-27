import { Request, Response } from 'express';
import { createLogger, Logger } from '@shared/infrastructure/logging';

/**
 * HTTP controller for health check operations.
 * Provides basic health status and service information.
 */
export class HealthController {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('health-controller');
  }

  /**
   * Basic health check endpoint
   * GET /health
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        status: 'healthy',
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };

      this.logger.info('Health check requested', {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      res.status(200).json(healthStatus);
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
   * Detailed health check with dependency status
   * GET /health/detailed
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        status: 'healthy',
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        dependencies: {
          database: await this.checkDatabaseHealth(),
          redis: await this.checkRedisHealth(),
          services: await this.checkServiceHealth()
        },
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          nodeVersion: process.version
        }
      };

      // Determine overall status based on dependencies
      const hasUnhealthyDependencies = [
        healthStatus.dependencies.database,
        healthStatus.dependencies.redis,
        ...Object.values(healthStatus.dependencies.services)
      ].some(dep => typeof dep === 'object' && dep.status !== 'healthy');

      if (hasUnhealthyDependencies) {
        healthStatus.status = 'degraded';
      }

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      this.logger.info('Detailed health check completed', {
        status: healthStatus.status,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      res.status(statusCode).json(healthStatus);
    } catch (error) {
      this.logger.error('Detailed health check failed', error as Error);
      
      res.status(503).json({
        status: 'unhealthy',
        service: 'saga-orchestrator-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check database connectivity
   * @returns Database health status
   */
  private async checkDatabaseHealth(): Promise<{ status: string; message?: string }> {
    try {
      // This would typically check database connectivity
      // For now, we'll assume it's healthy if DATABASE_URL is configured
      if (process.env.DATABASE_URL) {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', message: 'DATABASE_URL not configured' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Database check failed' 
      };
    }
  }

  /**
   * Check Redis connectivity
   * @returns Redis health status
   */
  private async checkRedisHealth(): Promise<{ status: string; message?: string }> {
    try {
      // This would typically check Redis connectivity
      // For now, we'll assume it's healthy if Redis configuration is present
      if (process.env.REDIS_HOST) {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', message: 'REDIS_HOST not configured' };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Redis check failed' 
      };
    }
  }

  /**
   * Check external service connectivity
   * @returns External services health status
   */
  private async checkServiceHealth(): Promise<{ 
    catalogService: { status: string; message?: string };
    transactionService: { status: string; message?: string };
    userService: { status: string; message?: string };
  }> {
    return {
      catalogService: await this.checkServiceUrl('CATALOG_SERVICE_URL'),
      transactionService: await this.checkServiceUrl('TRANSACTION_SERVICE_URL'),
      userService: await this.checkServiceUrl('USER_SERVICE_URL')
    };
  }

  /**
   * Check if a service URL is configured
   * @param envVar Environment variable name for the service URL
   * @returns Service health status
   */
  private async checkServiceUrl(envVar: string): Promise<{ status: string; message?: string }> {
    try {
      const serviceUrl = process.env[envVar];
      if (serviceUrl) {
        return { status: 'configured' };
      } else {
        return { status: 'not_configured', message: `${envVar} not configured` };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Service check failed' 
      };
    }
  }
}