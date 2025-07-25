import { databaseManager } from './database-manager';
import { databaseMetrics } from './database-metrics';
import { databaseLogger } from './database-logger';
import { createLogger } from '../logging';

const logger = createLogger('connection-optimizer');

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  acquireTimeout: number;
}

export interface PerformanceMetrics {
  averageQueryTime: number;
  slowQueryThreshold: number;
  connectionUtilization: number;
  waitingRequests: number;
  errorRate: number;
}

export interface OptimizationRecommendations {
  poolSize: {
    current: number;
    recommended: number;
    reason: string;
  };
  timeouts: {
    connection: number;
    acquire: number;
    reason: string;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    reason: string;
  };
  indexing: {
    recommendations: string[];
  };
}

export class ConnectionOptimizer {
  private static instance: ConnectionOptimizer;
  private readonly serviceName: string;
  private readonly performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 100;
  
  private constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  public static getInstance(serviceName: string): ConnectionOptimizer {
    if (!ConnectionOptimizer.instance) {
      ConnectionOptimizer.instance = new ConnectionOptimizer(serviceName);
    }
    return ConnectionOptimizer.instance;
  }
  
  /**
   * Analyze current database performance and provide optimization recommendations
   */
  public async analyzePerformance(): Promise<OptimizationRecommendations> {
    const currentMetrics = await this.collectCurrentMetrics();
    this.addToHistory(currentMetrics);
    
    const recommendations: OptimizationRecommendations = {
      poolSize: this.analyzePoolSize(currentMetrics),
      timeouts: this.analyzeTimeouts(currentMetrics),
      caching: this.analyzeCaching(currentMetrics),
      indexing: this.analyzeIndexing(currentMetrics)
    };
    
    logger.info('Performance analysis completed', {
      service: this.serviceName,
      recommendations
    });
    
    return recommendations;
  }
  
  /**
   * Apply automatic optimizations based on current performance
   */
  public async applyOptimizations(): Promise<void> {
    const recommendations = await this.analyzePerformance();
    
    // Log optimization actions
    logger.info('Applying database optimizations', {
      service: this.serviceName,
      recommendations
    });
    
    // Note: Actual Prisma connection pool settings would need to be configured
    // at the application level or through environment variables
    this.logOptimizationActions(recommendations);
  }
  
  /**
   * Monitor query performance and detect issues
   */
  public monitorQueryPerformance(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    rowsAffected?: number
  ): void {
    // Check for slow queries
    if (duration > 1.0) {
      this.handleSlowQuery(operation, table, duration);
    }
    
    // Check for high error rates
    if (!success) {
      this.handleQueryError(operation, table, duration);
    }
    
    // Check for inefficient queries (high duration, low row count)
    if (success && rowsAffected !== undefined && duration > 0.5 && rowsAffected < 10) {
      this.handleInefficientQuery(operation, table, duration, rowsAffected);
    }
  }
  
  /**
   * Optimize connection pool settings based on usage patterns
   */
  public optimizeConnectionPool(): ConnectionPoolConfig {
    const currentMetrics = this.getCurrentMetrics();
    
    const config: ConnectionPoolConfig = {
      minConnections: this.calculateMinConnections(currentMetrics),
      maxConnections: this.calculateMaxConnections(currentMetrics),
      connectionTimeout: this.calculateConnectionTimeout(currentMetrics),
      idleTimeout: this.calculateIdleTimeout(currentMetrics),
      maxLifetime: 3600000, // 1 hour
      acquireTimeout: this.calculateAcquireTimeout(currentMetrics)
    };
    
    logger.info('Connection pool optimization completed', {
      service: this.serviceName,
      config
    });
    
    return config;
  }
  
  /**
   * Generate performance report
   */
  public generatePerformanceReport(): {
    summary: any;
    trends: any;
    recommendations: OptimizationRecommendations;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const trends = this.analyzeTrends();
    
    return {
      summary: {
        service: this.serviceName,
        averageQueryTime: currentMetrics.averageQueryTime,
        connectionUtilization: currentMetrics.connectionUtilization,
        errorRate: currentMetrics.errorRate,
        timestamp: new Date().toISOString()
      },
      trends,
      recommendations: this.getLastRecommendations()
    };
  }
  
  private async collectCurrentMetrics(): Promise<PerformanceMetrics> {
    const connectionMetrics = databaseManager.getConnectionMetrics();
    
    return {
      averageQueryTime: connectionMetrics.averageQueryTime,
      slowQueryThreshold: 1.0, // 1 second
      connectionUtilization: connectionMetrics.activeConnections / connectionMetrics.poolSize,
      waitingRequests: connectionMetrics.waitingRequests,
      errorRate: this.calculateErrorRate()
    };
  }
  
  private addToHistory(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only the last N metrics
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }
  
  private analyzePoolSize(metrics: PerformanceMetrics): OptimizationRecommendations['poolSize'] {
    const currentSize = 10; // Default Prisma pool size
    let recommendedSize = currentSize;
    let reason = 'Current pool size is optimal';
    
    if (metrics.connectionUtilization > 0.8) {
      recommendedSize = Math.min(currentSize * 1.5, 20);
      reason = 'High connection utilization detected - increase pool size';
    } else if (metrics.connectionUtilization < 0.3) {
      recommendedSize = Math.max(currentSize * 0.7, 5);
      reason = 'Low connection utilization detected - decrease pool size';
    }
    
    if (metrics.waitingRequests > 5) {
      recommendedSize = Math.min(currentSize * 2, 25);
      reason = 'High number of waiting requests - increase pool size significantly';
    }
    
    return {
      current: currentSize,
      recommended: Math.round(recommendedSize),
      reason
    };
  }
  
  private analyzeTimeouts(metrics: PerformanceMetrics): OptimizationRecommendations['timeouts'] {
    let connectionTimeout = 5000; // 5 seconds default
    let acquireTimeout = 10000; // 10 seconds default
    let reason = 'Current timeout settings are optimal';
    
    if (metrics.averageQueryTime > 2.0) {
      connectionTimeout = 10000;
      acquireTimeout = 20000;
      reason = 'Slow queries detected - increase timeout values';
    } else if (metrics.errorRate > 0.05) {
      connectionTimeout = 8000;
      acquireTimeout = 15000;
      reason = 'High error rate detected - increase timeout values';
    }
    
    return {
      connection: connectionTimeout,
      acquire: acquireTimeout,
      reason
    };
  }
  
  private analyzeCaching(metrics: PerformanceMetrics): OptimizationRecommendations['caching'] {
    let enabled: boolean;
    let ttl: number;
    let reason: string;
    if (metrics.averageQueryTime > 1.0) {
      enabled = true;
      ttl = 600; // 10 minutes for slow queries
      reason = 'Slow queries detected - enable aggressive caching';
    } else if (metrics.averageQueryTime < 0.1) {
      enabled = true;
      ttl = 60; // 1 minute for fast queries
      reason = 'Fast queries detected - use shorter cache TTL';
    } else {
      enabled = true;
      ttl = 300; // 5 minutes default
      reason = 'Caching recommended for performance improvement';
    }
    return {
      enabled,
      ttl,
      reason
    };
  }
  
  private analyzeIndexing(metrics: PerformanceMetrics): OptimizationRecommendations['indexing'] {
    const recommendations: string[] = [];
    
    if (metrics.averageQueryTime > 1.0) {
      recommendations.push('Consider adding indexes for frequently queried columns');
      recommendations.push('Analyze slow query logs to identify missing indexes');
    }
    
    if (metrics.errorRate > 0.02) {
      recommendations.push('Review query patterns for potential optimization');
    }
    
    return { recommendations };
  }
  
  private handleSlowQuery(operation: string, table: string, duration: number): void {
    databaseLogger.logPerformanceAlert(this.serviceName, 'slow_query', {
      operation,
      table,
      duration,
      threshold: 1.0
    });
    
    // Record slow query metric
    databaseMetrics.recordQueryError(this.serviceName, operation, 'slow_query');
  }
  
  private handleQueryError(operation: string, table: string, duration: number): void {
    databaseLogger.logPerformanceAlert(this.serviceName, 'transaction_timeout', {
      operation,
      table,
      duration
    });
  }
  
  private handleInefficientQuery(
    operation: string,
    table: string,
    duration: number,
    rowsAffected: number
  ): void {
    databaseLogger.logPerformanceAlert(this.serviceName, 'slow_query', {
      operation,
      table,
      duration,
      rowsAffected,
      efficiency: rowsAffected / duration
    });
  }
  
  private calculateMinConnections(metrics: PerformanceMetrics): number {
    // Base minimum on average utilization
    const baseMin = Math.ceil(metrics.connectionUtilization * 10);
    return Math.max(baseMin, 2); // At least 2 connections
  }
  
  private calculateMaxConnections(metrics: PerformanceMetrics): number {
    // Base maximum on peak utilization and waiting requests
    const peakUtilization = metrics.connectionUtilization * 1.5;
    const waitingBuffer = metrics.waitingRequests;
    return Math.min(Math.ceil(peakUtilization * 10 + waitingBuffer), 25);
  }
  
  private calculateConnectionTimeout(metrics: PerformanceMetrics): number {
    // Adjust timeout based on average query time
    const baseTimeout = 5000;
    const multiplier = Math.max(metrics.averageQueryTime / 0.5, 1);
    return Math.min(baseTimeout * multiplier, 30000);
  }
  
  private calculateIdleTimeout(metrics: PerformanceMetrics): number {
    // Shorter idle timeout for high utilization
    if (metrics.connectionUtilization > 0.7) {
      return 300000; // 5 minutes
    }
    return 600000; // 10 minutes
  }
  
  private calculateAcquireTimeout(metrics: PerformanceMetrics): number {
    // Longer acquire timeout for high contention
    const baseTimeout = 10000;
    const contentionMultiplier = Math.max(metrics.waitingRequests / 5, 1);
    return Math.min(baseTimeout * contentionMultiplier, 60000);
  }
  
  private calculateErrorRate(): number {
    // This would typically be calculated from actual metrics
    // For now, return a simulated value
    return 0.02; // 2% error rate
  }
  
  private getCurrentMetrics(): PerformanceMetrics {
    if (this.performanceHistory.length === 0) {
      return {
        averageQueryTime: 0.1,
        slowQueryThreshold: 1.0,
        connectionUtilization: 0.5,
        waitingRequests: 0,
        errorRate: 0.01
      };
    }
    
    return this.performanceHistory[this.performanceHistory.length - 1];
  }
  
  private analyzeTrends(): any {
    if (this.performanceHistory.length < 2) {
      return { trend: 'insufficient_data' };
    }
    
    const recent = this.performanceHistory.slice(-10);
    const avgQueryTime = recent.reduce((sum, m) => sum + m.averageQueryTime, 0) / recent.length;
    const avgUtilization = recent.reduce((sum, m) => sum + m.connectionUtilization, 0) / recent.length;
    
    return {
      averageQueryTime: avgQueryTime,
      averageUtilization: avgUtilization,
      trend: avgQueryTime > 1.0 ? 'degrading' : 'stable'
    };
  }
  
  private getLastRecommendations(): OptimizationRecommendations {
    // Return cached recommendations or default ones
    return {
      poolSize: { current: 10, recommended: 10, reason: 'No analysis performed yet' },
      timeouts: { connection: 5000, acquire: 10000, reason: 'Default settings' },
      caching: { enabled: true, ttl: 300, reason: 'Default caching strategy' },
      indexing: { recommendations: [] }
    };
  }
  
  private logOptimizationActions(recommendations: OptimizationRecommendations): void {
    logger.info('Database optimization recommendations', {
      service: this.serviceName,
      poolSize: recommendations.poolSize,
      timeouts: recommendations.timeouts,
      caching: recommendations.caching,
      indexing: recommendations.indexing
    });
    
    // Log specific actions that would be taken
    if (recommendations.poolSize.current !== recommendations.poolSize.recommended) {
      logger.warn('Pool size adjustment recommended', {
        service: this.serviceName,
        current: recommendations.poolSize.current,
        recommended: recommendations.poolSize.recommended,
        reason: recommendations.poolSize.reason
      });
    }
  }
}