/**
 * Cache Middleware for Express
 * 
 * Provides middleware for caching HTTP responses in Express applications.
 */

import { Request, Response, NextFunction } from 'express';
import { CacheService } from './cache-service';
import { createLogger } from '../logging';

// Create a logger for cache middleware
const logger = createLogger('cache-middleware');

// Default cache TTL (1 hour)
const DEFAULT_TTL = parseInt(process.env['CACHE_DEFAULT_TTL'] || '3600', 10);

/**
 * Key generator function type
 */
type KeyGenerator = (req: Request) => string;

/**
 * Cache middleware options
 */
export interface CacheMiddlewareOptions {
  ttl?: number;
  keyGenerator?: KeyGenerator;
  cacheService?: CacheService;
}

/**
 * Default key generator function
 * Creates a cache key based on request method, path, and query parameters
 * 
 * @param req Express request object
 * @returns Cache key
 */
export const defaultKeyGenerator = (req: Request): string => {
  const queryString = Object.keys(req.query).length > 0 
    ? ':' + JSON.stringify(req.query) 
    : '';
  return `${req.method}:${req.path}${queryString}`;
};

/**
 * Creates cache middleware for Express
 * 
 * @param options Cache middleware options
 * @returns Express middleware function
 */
export const createCacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const {
    ttl = DEFAULT_TTL,
    keyGenerator = defaultKeyGenerator,
  } = options;

  // Import default cache service lazily
  const getCacheService = async (): Promise<CacheService> => {
    if (options.cacheService) {
      return options.cacheService;
    }
    
    const { default: defaultCacheService } = await import('./cache-service');
    return defaultCacheService;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator(req);

      // Get cache service instance
      const cacheService = await getCacheService();

      // Try to get from cache
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        logger.info('Serving cached response', { path: req.path });
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // Cache miss - intercept response
      res.set('X-Cache', 'MISS');
      const originalJson = res.json;
      
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl)
            .then(() => {
              logger.info('Response cached', { path: req.path, ttl });
            })
            .catch(error => {
              logger.error('Failed to cache response', error as Error);
            });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', error as Error);
      next();
    }
  };
};

export default createCacheMiddleware;
