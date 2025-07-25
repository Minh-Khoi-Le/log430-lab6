import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../logging';

const logger = createLogger('http');

/**
 * Middleware that logs HTTP requests and responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Log the request
  logger.info(`Incoming request`, { method, url, ip });
  
  // Store original methods to intercept and log them
  const originalEnd = res.end;
  const originalJson = res.json;
  
  // Intercept res.end to log response
  res.end = function(this: Response, chunk?: any, encoding?: any, callback?: any): any {
    const duration = Date.now() - start;
    logger.info(`Response sent`, { 
      method, 
      url, 
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    return originalEnd.call(this, chunk, encoding, callback);
  } as any;
  
  // Intercept res.json to log json responses
  res.json = function(this: Response, body: any): any {
    const duration = Date.now() - start;
    logger.info(`JSON response`, { 
      method, 
      url, 
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      size: JSON.stringify(body).length
    });
    
    return originalJson.call(this, body);
  } as any;
  
  next();
};
