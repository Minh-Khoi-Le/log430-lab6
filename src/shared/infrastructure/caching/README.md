# Shared Caching Service

A centralized caching utility that provides Redis-based caching capabilities across all microservices.

## Features

- Redis-backed caching for high performance and reliability
- Simple get/set/delete operations with JSON serialization
- Automatic key namespacing by service
- Configurable time-to-live (TTL) values
- Express middleware for HTTP response caching
- Cache invalidation strategies (single key, multiple keys, patterns)
- Connection management with automatic reconnection
- Cache statistics and monitoring
- TypeScript support with full type safety

## Installation

The caching service requires Redis to be available. Make sure you have Redis running in your environment or accessible via a connection URL.

### Required Environment Variables

```bash
REDIS_URL=redis://localhost:6379  # Redis connection URL (optional if using host/port)
REDIS_HOST=localhost              # Redis host (used if URL not provided)
REDIS_PORT=6379                   # Redis port (used if URL not provided)
REDIS_PASSWORD=secret             # Redis password (optional)
REDIS_USERNAME=username           # Redis username (optional)
REDIS_DB=0                        # Redis database number (optional)
REDIS_TLS=false                   # Use TLS for connection (optional)
CACHE_PREFIX=log430               # Prefix for cache keys (optional)
CACHE_DEFAULT_TTL=3600            # Default TTL in seconds (optional)
SERVICE_NAME=your-service         # Service name for key namespacing (optional)
```

## Usage

### Basic Caching Operations

```typescript
import { cacheService } from '@shared/infrastructure/caching';

// Store data in cache (with default TTL)
await cacheService.set('user:123', { id: 123, name: 'John Doe' });

// Store data with custom TTL (5 minutes)
await cacheService.set('user:profile:123', profileData, 300);

// Retrieve data from cache
const user = await cacheService.get('user:123');
if (user) {
  console.log('User found in cache:', user);
} else {
  console.log('User not found in cache');
}

// Delete from cache
await cacheService.delete('user:123');

// Check if key exists
const exists = await cacheService.exists('user:123');
```

### Cache Middleware for Express

```typescript
import express from 'express';
import { createCacheMiddleware } from '@shared/infrastructure/caching';

const app = express();

// Cache all GET requests to /api/products for 5 minutes
app.get('/api/products', createCacheMiddleware({ ttl: 300 }), (req, res) => {
  // This handler will only be called on cache miss
  res.json(products);
});

// Custom cache key generation
app.get('/api/users/:id', createCacheMiddleware({
  ttl: 60, // 1 minute
  keyGenerator: (req) => `user:${req.params.id}`
}), (req, res) => {
  // ...
});
```

### Cache Invalidation

```typescript
// Delete a single key
await cacheService.delete('user:123');

// Delete multiple keys
await cacheService.deleteMultiple(['user:123', 'user:profile:123']);

// Delete all keys for a specific user (pattern-based)
await cacheService.invalidatePattern('user:*:123');

// Clear all cache for the current service
await cacheService.clearServiceCache();
```

### Custom Cache Configuration

```typescript
import { CacheService, RedisClient } from '@shared/infrastructure/caching';

// Create a custom Redis client
const redisClient = new RedisClient({
  url: 'redis://custom-redis:6379',
  password: 'secret-password'
});

// Connect to Redis
await redisClient.connect();

// Create a custom cache service
const customCache = new CacheService(redisClient, 'payment-service', {
  prefix: 'custom-prefix',
  defaultTtl: 1800 // 30 minutes
});

// Use the custom cache
await customCache.set('transaction:123', transactionData);
```

## Best Practices

### What to Cache

- Frequently accessed, rarely changing data
- Expensive database queries or computations
- API responses that don't need to be real-time
- Session data, authentication tokens

### What Not to Cache

- Rapidly changing data
- User-specific sensitive information
- Very large objects (can exhaust Redis memory)
- Already fast operations where caching adds overhead

### Cache Invalidation Strategies

1. **Time-based invalidation**: Set appropriate TTL values based on data volatility
2. **Event-based invalidation**: Invalidate cache when data changes
3. **Versioned keys**: Include a version in the cache key that changes when data is updated

### Cache Keys

- Use consistent naming conventions (e.g., `entity:id:attribute`)
- Include enough information for unique identification
- Keep keys reasonably short
- Use namespaces to group related keys

## Integration with Services

```typescript
// user.service.ts
import { cacheService } from '@shared/infrastructure/caching';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUserById(id: number): Promise<User | null> {
    // Try to get from cache first
    const cacheKey = `user:${id}`;
    const cachedUser = await cacheService.get<User>(cacheKey);
    
    if (cachedUser) {
      return cachedUser;
    }
    
    // If not in cache, get from database
    const user = await this.userRepository.findById(id);
    
    // Store in cache for future requests (cache for 15 minutes)
    if (user) {
      await cacheService.set(cacheKey, user, 900);
    }
    
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    // Update in database
    const updatedUser = await this.userRepository.update(id, data);
    
    // Update cache
    await cacheService.set(`user:${id}`, updatedUser);
    
    // Invalidate related caches
    await cacheService.invalidatePattern(`user:${id}:*`);
    
    return updatedUser;
  }
}
```

## Future Enhancements

- Circuit breaker pattern for Redis connection failures
- Cache warming strategies
- Advanced cache statistics and monitoring
- Support for additional cache stores (Memcached, in-memory)
- Batch operations for improved performance
- Compression for large values
- Automatic cache pruning strategies
