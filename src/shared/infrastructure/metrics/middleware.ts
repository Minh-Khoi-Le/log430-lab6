import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInProgress,
  activeConnections,
  cpuUsage,
  memoryUsage
} from './index';

interface MetricsRequest extends Request {
  startTime?: number;
}

export const metricsMiddleware = (serviceName: string) => {
  return (req: MetricsRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    req.startTime = startTime;
    
    // Get route pattern (remove query parameters and dynamic segments)
    const route = req.route ? req.route.path : req.path;
    
    // Track request start
    httpRequestsInProgress.inc({ 
      method: req.method, 
      route: route,
      service: serviceName 
    });
    
    // Track active connections
    activeConnections.inc({ service: serviceName });
    
    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      httpRequestDuration
        .labels(req.method, route, res.statusCode.toString(), serviceName)
        .observe(duration);
      
      httpRequestsTotal.inc({
        method: req.method,
        route: route,
        status_code: res.statusCode.toString(),
        service: serviceName
      });
      
      httpRequestsInProgress.dec({ 
        method: req.method, 
        route: route,
        service: serviceName 
      });
      
      activeConnections.dec({ service: serviceName });
      
      // Call original end
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    next();
  };
};

// System metrics collection
export const collectSystemMetrics = (serviceName: string) => {
  const collectMetrics = () => {
    // CPU usage
    const usage = process.cpuUsage();
    const cpuPercent = (usage.user + usage.system) / 1000000; // Convert to seconds
    cpuUsage.set({ service: serviceName }, cpuPercent);
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    memoryUsage.set({ service: serviceName }, memPercent);
  };
  
  // Collect metrics every 15 seconds
  setInterval(collectMetrics, 15000);
  
  // Collect initial metrics
  collectMetrics();
};
