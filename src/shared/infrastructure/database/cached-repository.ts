import { CacheService } from "../caching/cache-service";
import { databaseManager } from "./database-manager";
import { databaseLogger } from "./database-logger";
import { createLogger } from "../logging";

const logger = createLogger("cached-repository");

export interface CacheConfig {
  defaultTtl: number;
  keyPrefix: string;
  enableCaching: boolean;
  cacheInvalidationStrategy: "manual" | "time-based" | "write-through";
}

export interface CacheableQuery<T> {
  key: string;
  ttl?: number;
  tags?: string[];
  operation: () => Promise<T>;
}

export interface CacheInvalidationOptions {
  keys?: string[];
  tags?: string[];
  pattern?: string;
}

export abstract class CachedRepository {
  protected readonly cacheService: CacheService;
  protected readonly serviceName: string;
  protected readonly cacheConfig: CacheConfig;

  constructor(
    cacheService: CacheService,
    serviceName: string,
    cacheConfig: Partial<CacheConfig> = {}
  ) {
    this.cacheService = cacheService;
    this.serviceName = serviceName;
    this.cacheConfig = {
      defaultTtl: 300, // 5 minutes default
      keyPrefix: "repo",
      enableCaching: true,
      cacheInvalidationStrategy: "manual",
      ...cacheConfig,
    };
  }

  /**
   * Execute a cacheable query with automatic caching and monitoring
   */
  protected async executeWithCache<T>(query: CacheableQuery<T>): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(query.key);

    // Check if caching is enabled
    if (
      !this.cacheConfig.enableCaching ||
      !this.cacheService.isCacheAvailable()
    ) {
      logger.info("Cache disabled or unavailable, executing query directly", {
        service: this.serviceName,
        key: query.key,
      });
      return await this.executeQuery(query);
    }

    try {
      // Try to get from cache first
      const cachedResult = await this.cacheService.get<T>(cacheKey);

      if (cachedResult !== null) {
        const duration = (Date.now() - startTime) / 1000;

        // Record cache hit metrics
        this.recordCacheMetrics("hit", query.key, duration);

        logger.info("Cache hit", {
          service: this.serviceName,
          key: query.key,
          duration,
        });

        return cachedResult;
      }

      // Cache miss - execute query
      const result = await this.executeQuery(query);

      // Cache the result
      const ttl = query.ttl || this.cacheConfig.defaultTtl;
      await this.cacheService.set(cacheKey, result, ttl);

      // Store cache tags for invalidation
      if (query.tags && query.tags.length > 0) {
        await this.storeCacheTags(cacheKey, query.tags);
      }

      const duration = (Date.now() - startTime) / 1000;
      this.recordCacheMetrics("miss", query.key, duration);

      logger.info("Cache miss - result cached", {
        service: this.serviceName,
        key: query.key,
        ttl,
        duration,
      });

      return result;
    } catch (error) {
      logger.error("Cache operation failed, falling back to direct query", (error instanceof Error ? error : new Error(String(error))));

      // Fallback to direct query execution
      return await this.executeQuery(query);
    }
  }

  /**
   * Execute query with database monitoring
   */
  private async executeQuery<T>(query: CacheableQuery<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await query.operation();
      const duration = (Date.now() - startTime) / 1000;

      // Record successful database operation
      databaseManager.recordQuery(
        "query",
        this.extractTableFromKey(query.key),
        duration,
        true,
        this.extractRowCount(result)
      );

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      // Record failed database operation
      databaseManager.recordQuery(
        "query",
        this.extractTableFromKey(query.key),
        duration,
        false
      );

      databaseLogger.logOperation({
        serviceName: this.serviceName,
        operation: "query",
        table: this.extractTableFromKey(query.key),
        duration,
        success: false,
        error: error as Error,
      });

      throw error;
    }
  }

  /**
   * Invalidate cache entries
   */
  protected async invalidateCache(
    options: CacheInvalidationOptions
  ): Promise<number> {
    let deletedCount = 0;

    try {
      // Invalidate specific keys
      if (options.keys && options.keys.length > 0) {
        const cacheKeys = options.keys.map((key) => this.buildCacheKey(key));
        deletedCount += await this.cacheService.deleteMultiple(cacheKeys);
      }

      // Invalidate by pattern
      if (options.pattern) {
        const pattern = this.buildCacheKey(options.pattern);
        deletedCount += await this.cacheService.invalidatePattern(pattern);
      }

      // Invalidate by tags
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const taggedKeys = await this.getCacheKeysByTag(tag);
          if (taggedKeys.length > 0) {
            deletedCount += await this.cacheService.deleteMultiple(taggedKeys);
          }
        }
      }

      logger.info("Cache invalidation completed", {
        service: this.serviceName,
        deletedCount,
        options,
      });

      return deletedCount;
    } catch (error) {
      logger.error("Cache invalidation failed", (error instanceof Error ? error : new Error(String(error))));
      return 0;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  protected async warmUpCache(queries: CacheableQuery<any>[]): Promise<void> {
    logger.info("Starting cache warm-up", {
      service: this.serviceName,
      queryCount: queries.length,
    });

    const promises = queries.map(async (query) => {
      try {
        await this.executeWithCache(query);
      } catch (error) {
        logger.warn("Cache warm-up query failed", {
          service: this.serviceName,
          key: query.key,
          error: (error as Error).message,
        });
      }
    });

    await Promise.allSettled(promises);

    logger.info("Cache warm-up completed", {
      service: this.serviceName,
      queryCount: queries.length,
    });
  }

  /**
   * Get cache statistics for this repository
   */
  protected async getCacheStats(): Promise<{
    hitRate: number;
    totalQueries: number;
    cacheSize: number;
  }> {
    // This would typically be implemented with Redis metrics
    // For now, return basic stats
    return {
      hitRate: 0.85, // 85% hit rate example
      totalQueries: 1000,
      cacheSize: 50,
    };
  }

  /**
   * Build cache key with proper prefixing
   */
  private buildCacheKey(key: string): string {
    return `${this.cacheConfig.keyPrefix}:${this.serviceName}:${key}`;
  }

  /**
   * Store cache tags for invalidation
   */
  private async storeCacheTags(
    cacheKey: string,
    tags: string[]
  ): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        // Store the relationship between tag and cache key
        // This is a simplified implementation - in production you might use Redis sets
        await this.cacheService.set(tagKey, [cacheKey], 3600); // 1 hour TTL for tag mappings
      }
    } catch (error) {
      logger.warn("Failed to store cache tags", {
        cacheKey,
        tags,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get cache keys by tag
   */
  private async getCacheKeysByTag(tag: string): Promise<string[]> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.cacheService.get<string[]>(tagKey);
      return keys || [];
    } catch (error) {
      logger.warn("Failed to get cache keys by tag", {
        tag,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Record cache metrics
   */
  private recordCacheMetrics(
    type: "hit" | "miss",
    key: string,
    duration: number
  ): void {
    // This would integrate with the existing metrics system
    databaseLogger.logOperation({
      serviceName: this.serviceName,
      operation: `cache_${type}`,
      table: this.extractTableFromKey(key),
      duration,
      success: true,
    });
  }

  /**
   * Extract table name from cache key
   */
  private extractTableFromKey(key: string): string {
    // Simple extraction - in practice this might be more sophisticated
    const parts = key.split(":");
    return parts[0] || "unknown";
  }

  /**
   * Extract row count from result
   */
  private extractRowCount(result: any): number | undefined {
    if (Array.isArray(result)) {
      return result.length;
    }
    if (result && typeof result === "object" && "count" in result) {
      return result.count;
    }
    return undefined;
  }
}
