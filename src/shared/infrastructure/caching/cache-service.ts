/**
 * Redis Cache Service
 * 
 * Provides caching functionality with Redis, including:
 * - Simple get/set/delete operations
 * - Cached key generation
 * - Cache invalidation strategies
 * - Cache statistics
 */

import { RedisClient } from './redis-client';
import { createLogger } from '../logging';

// Create a logger for the cache service
const logger = createLogger('cache-service');

// Default cache TTL (1 hour)
const DEFAULT_TTL = parseInt(process.env['CACHE_DEFAULT_TTL'] ?? '3600', 10);

// Service name for key prefixing
const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'unknown-service';

// Cache prefix for namespacing
const CACHE_PREFIX = process.env['CACHE_PREFIX'] ?? 'log430';

/**
 * Cache Service class providing Redis caching functionality
 */
export class CacheService {
  private readonly redisClient: RedisClient;
  private readonly serviceName: string;
  private readonly cachePrefix: string;
  private readonly defaultTtl: number;

  /**
   * Creates a new cache service instance
   * 
   * @param redisClient Redis client instance
   * @param serviceName Service name for key prefixing
   * @param options Additional options
   */
  constructor(
    redisClient: RedisClient,
    serviceName: string = SERVICE_NAME,
    options: { prefix?: string; defaultTtl?: number } = {}
  ) {
    this.redisClient = redisClient;
    this.serviceName = serviceName;
    this.cachePrefix = options.prefix || CACHE_PREFIX;
    this.defaultTtl = options.defaultTtl || DEFAULT_TTL;
  }

  /**
   * Generates a cache key with service prefix
   * 
   * @param key Base key
   * @param parts Additional key parts
   * @returns Formatted cache key
   */
  public generateCacheKey(key: string, ...parts: string[]): string {
    const keyParts = [this.cachePrefix, this.serviceName, key, ...parts].filter(Boolean);
    return keyParts.join(':');
  }

  /**
   * Checks if cache is available
   * 
   * @returns True if cache is connected
   */
  public isCacheAvailable(): boolean {
    return this.redisClient.isConnected;
  }

  /**
   * Gets a value from cache
   * 
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!this.isCacheAvailable()) {
      logger.info('Cache not available for get operation', { key });
      return null;
    }

    try {
      const startTime = Date.now();
      const cacheKey = this.generateCacheKey(key);
      const value = await this.redisClient.redisClient.get(cacheKey);
      const duration = Date.now() - startTime;

      if (value !== null) {
        logger.info('Cache hit', { key: cacheKey, duration });
        return JSON.parse(value) as T;
      } else {
        logger.info('Cache miss', { key: cacheKey, duration });
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', error as Error, { key });
      return null;
    }
  }

  /**
   * Sets a value in cache
   * 
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   * @returns True if successful
   */
  public async set<T>(key: string, value: T, ttl: number = this.defaultTtl): Promise<boolean> {
    if (!this.isCacheAvailable()) {
      logger.info('Cache not available for set operation', { key });
      return false;
    }

    try {
      const startTime = Date.now();
      const cacheKey = this.generateCacheKey(key);
      const serializedValue = JSON.stringify(value);
      
      await this.redisClient.redisClient.setEx(cacheKey, ttl, serializedValue);
      
      const duration = Date.now() - startTime;
      logger.info('Cache set successful', { key: cacheKey, ttl, duration });
      return true;
    } catch (error) {
      logger.error('Cache set error', error as Error, { key, ttl });
      return false;
    }
  }

  /**
   * Deletes a value from cache
   * 
   * @param key Cache key
   * @returns True if deleted
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.isCacheAvailable()) {
      logger.info('Cache not available for delete operation', { key });
      return false;
    }

    try {
      const startTime = Date.now();
      const cacheKey = this.generateCacheKey(key);
      const result = await this.redisClient.redisClient.del(cacheKey);
      const duration = Date.now() - startTime;
      
      logger.info('Cache delete', { key: cacheKey, deleted: result > 0, duration });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', error as Error, { key });
      return false;
    }
  }

  /**
   * Deletes multiple values from cache
   * 
   * @param keys Array of cache keys
   * @returns Number of deleted keys
   */
  public async deleteMultiple(keys: string[]): Promise<number> {
    if (!this.isCacheAvailable() || !keys.length) {
      return 0;
    }

    try {
      const startTime = Date.now();
      const cacheKeys = keys.map(key => this.generateCacheKey(key));
      const result = await this.redisClient.redisClient.del(cacheKeys);
      const duration = Date.now() - startTime;
      
      logger.info('Cache delete multiple', { deleted: result, duration });
      return result;
    } catch (error) {
      logger.error('Cache delete multiple error', error as Error);
      return 0;
    }
  }

  /**
   * Clears all cache keys with service prefix
   * 
   * @returns Number of deleted keys
   */
  public async clearServiceCache(): Promise<number> {
    if (!this.isCacheAvailable()) {
      return 0;
    }

    try {
      const startTime = Date.now();
      const pattern = this.generateCacheKey('*');
      const keys = await this.redisClient.redisClient.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redisClient.redisClient.del(keys);
      const duration = Date.now() - startTime;
      
      logger.info('Service cache cleared', { keysDeleted: result, duration });
      return result;
    } catch (error) {
      logger.error('Cache clear error', error as Error);
      return 0;
    }
  }

  /**
   * Checks if key exists in cache
   * 
   * @param key Cache key
   * @returns True if key exists
   */
  public async exists(key: string): Promise<boolean> {
    if (!this.isCacheAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey(key);
      const exists = await this.redisClient.redisClient.exists(cacheKey);
      return Number(exists) === 1;
    } catch (error) {
      logger.error('Cache exists error', error as Error, { key });
      return false;
    }
  }

  /**
   * Sets cache expiration
   * 
   * @param key Cache key
   * @param ttl Time to live in seconds
   * @returns True if successful
   */
  public async setExpiration(key: string, ttl: number): Promise<boolean> {
    if (!this.isCacheAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateCacheKey(key);
      const result = await this.redisClient.redisClient.expire(cacheKey, ttl);
      return Number(result) === 1;
    } catch (error) {
      logger.error('Cache expire error', error as Error, { key, ttl });
      return false;
    }
  }

  /**
   * Gets cache TTL
   * 
   * @param key Cache key
   * @returns TTL in seconds or -1 if key doesn't exist
   */
  public async getTTL(key: string): Promise<number> {
    if (!this.isCacheAvailable()) {
      return -1;
    }

    try {
      const cacheKey = this.generateCacheKey(key);
      return await this.redisClient.redisClient.ttl(cacheKey);
    } catch (error) {
      logger.error('Cache TTL error', error as Error, { key });
      return -1;
    }
  }

  /**
   * Invalidates cache keys by pattern
   * 
   * @param pattern Key pattern to invalidate
   * @returns Number of deleted keys
   */
  public async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isCacheAvailable()) {
      return 0;
    }

    try {
      const startTime = Date.now();
      const searchPattern = this.generateCacheKey(pattern);
      const keys = await this.redisClient.redisClient.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redisClient.redisClient.del(keys);
      const duration = Date.now() - startTime;
      
      logger.info('Cache pattern invalidated', { 
        pattern: searchPattern, 
        keysDeleted: result, 
        duration 
      });
      return result;
    } catch (error) {
      logger.error('Cache pattern invalidation error', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Gets cache statistics
   * 
   * @returns Cache statistics or null if cache not available
   */
  public async getStats(): Promise<any | null> {
    if (!this.isCacheAvailable()) {
      return null;
    }

    try {
      const info = await this.redisClient.redisClient.info('memory');
      const keyspace = await this.redisClient.redisClient.info('keyspace');
      
      return {
        connected: this.isCacheAvailable(),
        memory: info,
        keyspace: keyspace,
        service: this.serviceName
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error);
      return null;
    }
  }
}

// Create and export a default cache service instance
const defaultRedisClient = new RedisClient();
const cacheService = new CacheService(defaultRedisClient);
export default cacheService;
