import { CacheService } from '../caching/cache-service';
import { createLogger } from '../logging';

const logger = createLogger('cache-invalidation');

export interface InvalidationRule {
  trigger: {
    table: string;
    operation: 'create' | 'update' | 'delete';
    conditions?: Record<string, any>;
  };
  targets: {
    keys?: string[];
    patterns?: string[];
    tags?: string[];
    services?: string[];
  };
  delay?: number; // Delay in milliseconds before invalidation
}

export interface InvalidationEvent {
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string | number;
  oldData?: any;
  newData?: any;
  timestamp: Date;
}

export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private readonly cacheService: CacheService;
  private readonly rules: Map<string, InvalidationRule[]> = new Map();
  private readonly pendingInvalidations: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }
  
  public static getInstance(cacheService: CacheService): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager(cacheService);
    }
    return CacheInvalidationManager.instance;
  }
  
  /**
   * Register invalidation rules for specific tables and operations
   */
  public registerRule(ruleId: string, rule: InvalidationRule): void {
    const key = `${rule.trigger.table}:${rule.trigger.operation}`;
    
    if (!this.rules.has(key)) {
      this.rules.set(key, []);
    }
    
    this.rules.get(key)!.push({ ...rule });
    
    logger.info('Cache invalidation rule registered', {
      ruleId,
      trigger: rule.trigger,
      targets: rule.targets
    });
  }
  
  /**
   * Remove invalidation rule
   */
  public unregisterRule(ruleId: string, table: string, operation: string): void {
    const key = `${table}:${operation}`;
    const rules = this.rules.get(key);
    
    if (rules) {
      // In a real implementation, you'd need to track rule IDs
      // For now, we'll just log the removal
      logger.info('Cache invalidation rule unregistered', {
        ruleId,
        table,
        operation
      });
    }
  }
  
  /**
   * Handle database change event and trigger cache invalidation
   */
  public async handleDatabaseChange(event: InvalidationEvent): Promise<void> {
    const key = `${event.table}:${event.operation}`;
    const rules = this.rules.get(key);
    
    if (!rules || rules.length === 0) {
      logger.info('No invalidation rules found for event', {
        table: event.table,
        operation: event.operation
      });
      return;
    }
    
    logger.info('Processing database change event', {
      table: event.table,
      operation: event.operation,
      recordId: event.recordId,
      rulesCount: rules.length
    });
    
    for (const rule of rules) {
      await this.processInvalidationRule(rule, event);
    }
  }
  
  /**
   * Process a single invalidation rule
   */
  private async processInvalidationRule(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    // Check if rule conditions are met
    if (!this.evaluateRuleConditions(rule, event)) {
      logger.info('Rule conditions not met, skipping invalidation', {
        rule: rule.trigger,
        event: { table: event.table, operation: event.operation }
      });
      return;
    }
    
    // Apply delay if specified
    if (rule.delay && rule.delay > 0) {
      await this.scheduleDelayedInvalidation(rule, event);
    } else {
      await this.executeInvalidation(rule, event);
    }
  }
  
  /**
   * Execute cache invalidation based on rule targets
   */
  private async executeInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    let totalInvalidated = 0;
    
    try {
      // Invalidate specific keys
      if (rule.targets.keys && rule.targets.keys.length > 0) {
        const keys = this.interpolateKeys(rule.targets.keys, event);
        const deleted = await this.cacheService.deleteMultiple(keys);
        totalInvalidated += deleted;
        
        logger.info('Invalidated specific keys', {
          keys,
          deleted
        });
      }
      
      // Invalidate by patterns
      if (rule.targets.patterns && rule.targets.patterns.length > 0) {
        for (const pattern of rule.targets.patterns) {
          const interpolatedPattern = this.interpolatePattern(pattern, event);
          const deleted = await this.cacheService.invalidatePattern(interpolatedPattern);
          totalInvalidated += deleted;
          
          logger.info('Invalidated by pattern', {
            pattern: interpolatedPattern,
            deleted
          });
        }
      }
      
      // Invalidate by tags
      if (rule.targets.tags && rule.targets.tags.length > 0) {
        for (const tag of rule.targets.tags) {
          const interpolatedTag = this.interpolatePattern(tag, event);
          // This would require a tag-based invalidation system
          // For now, we'll use pattern-based invalidation
          const deleted = await this.cacheService.invalidatePattern(`*:${interpolatedTag}:*`);
          totalInvalidated += deleted;
          
          logger.info('Invalidated by tag', {
            tag: interpolatedTag,
            deleted
          });
        }
      }
      
      // Cross-service invalidation
      if (rule.targets.services && rule.targets.services.length > 0) {
        await this.invalidateAcrossServices(rule.targets.services, event);
      }
      
      logger.info('Cache invalidation completed', {
        trigger: rule.trigger,
        event: { table: event.table, operation: event.operation, recordId: event.recordId },
        totalInvalidated
      });
      
    } catch (error) {
      logger.error('Cache invalidation failed', (error instanceof Error ? error : new Error(String(error))));
    }
  }
  
  /**
   * Schedule delayed invalidation
   */
  private async scheduleDelayedInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    const delayKey = `${event.table}:${event.operation}:${event.recordId}:${Date.now()}`;
    
    // Cancel any existing delayed invalidation for the same key
    if (this.pendingInvalidations.has(delayKey)) {
      clearTimeout(this.pendingInvalidations.get(delayKey));
    }
    
    const timeout = setTimeout(async () => {
      await this.executeInvalidation(rule, event);
      this.pendingInvalidations.delete(delayKey);
    }, rule.delay);
    
    this.pendingInvalidations.set(delayKey, timeout);
    
    logger.info('Scheduled delayed cache invalidation', {
      delayKey,
      delay: rule.delay,
      trigger: rule.trigger
    });
  }
  
  /**
   * Evaluate rule conditions against the event
   */
  private evaluateRuleConditions(rule: InvalidationRule, event: InvalidationEvent): boolean {
    if (!rule.trigger.conditions) {
      return true; // No conditions means always trigger
    }
    
    // Simple condition evaluation - in practice this would be more sophisticated
    for (const [field, expectedValue] of Object.entries(rule.trigger.conditions)) {
      const eventValue = this.getEventFieldValue(event, field);
      
      if (eventValue !== expectedValue) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get field value from event data
   */
  private getEventFieldValue(event: InvalidationEvent, field: string): any {
    if (field === 'recordId') {
      return event.recordId;
    }
    
    // Check in new data first, then old data
    if (event.newData && field in event.newData) {
      return event.newData[field];
    }
    
    if (event.oldData && field in event.oldData) {
      return event.oldData[field];
    }
    
    return undefined;
  }
  
  /**
   * Interpolate keys with event data
   */
  private interpolateKeys(keys: string[], event: InvalidationEvent): string[] {
    return keys.map(key => this.interpolatePattern(key, event));
  }
  
  /**
   * Interpolate pattern with event data
   */
  private interpolatePattern(pattern: string, event: InvalidationEvent): string {
    let result = pattern;
    
    // Replace common placeholders
    result = result.replace('{table}', event.table);
    result = result.replace('{operation}', event.operation);
    result = result.replace('{recordId}', String(event.recordId));
    
    // Replace field values from event data
    if (event.newData) {
      for (const [field, value] of Object.entries(event.newData)) {
        result = result.replace(`{${field}}`, String(value));
      }
    }
    
    if (event.oldData) {
      for (const [field, value] of Object.entries(event.oldData)) {
        result = result.replace(`{old.${field}}`, String(value));
      }
    }
    
    return result;
  }
  
  /**
   * Invalidate cache across multiple services
   */
  private async invalidateAcrossServices(services: string[], event: InvalidationEvent): Promise<void> {
    // This would typically involve messaging or API calls to other services
    // For now, we'll just log the cross-service invalidation
    logger.info('Cross-service cache invalidation triggered', {
      services,
      event: {
        table: event.table,
        operation: event.operation,
        recordId: event.recordId
      }
    });
    
    // In a real implementation, you might:
    // 1. Send messages to a message queue
    // 2. Make HTTP calls to other services' invalidation endpoints
    // 3. Use a distributed cache invalidation system
  }
  
  /**
   * Get invalidation statistics
   */
  public getStats(): {
    rulesCount: number;
    pendingInvalidations: number;
    rulesByTable: Record<string, number>;
  } {
    const rulesByTable: Record<string, number> = {};
    
    for (const [key, rules] of this.rules.entries()) {
      const table = key.split(':')[0];
      rulesByTable[table] = (rulesByTable[table] || 0) + rules.length;
    }
    
    return {
      rulesCount: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0),
      pendingInvalidations: this.pendingInvalidations.size,
      rulesByTable
    };
  }
  
  /**
   * Clear all pending invalidations
   */
  public clearPendingInvalidations(): void {
    for (const timeout of this.pendingInvalidations.values()) {
      clearTimeout(timeout);
    }
    this.pendingInvalidations.clear();
    
    logger.info('All pending cache invalidations cleared');
  }
}

// Common invalidation rules for typical scenarios
export const CommonInvalidationRules = {
  /**
   * User-related invalidations
   */
  userUpdated: (userId: string): InvalidationRule => ({
    trigger: {
      table: 'User',
      operation: 'update'
    },
    targets: {
      patterns: [
        `user:${userId}:*`,
        `profile:${userId}:*`,
        `auth:${userId}:*`
      ],
      tags: ['user-data', 'user-profile']
    }
  }),
  
  /**
   * Product-related invalidations
   */
  productUpdated: (): InvalidationRule => ({
    trigger: {
      table: 'Product',
      operation: 'update'
    },
    targets: {
      patterns: [
        'product:{recordId}:*',
        'catalog:*',
        'inventory:*'
      ],
      tags: ['product-catalog', 'inventory'],
      services: ['catalog-service', 'transaction-service']
    }
  }),
  
  /**
   * Stock-related invalidations
   */
  stockUpdated: (): InvalidationRule => ({
    trigger: {
      table: 'Stock',
      operation: 'update'
    },
    targets: {
      patterns: [
        'stock:*',
        'inventory:*',
        'product:*:availability'
      ],
      tags: ['inventory', 'product-availability'],
      services: ['catalog-service', 'transaction-service']
    },
    delay: 1000 // 1 second delay to batch stock updates
  })
};