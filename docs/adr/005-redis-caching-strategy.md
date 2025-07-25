# ADR-005: Stratégie de mise en cache Redis pour l'optimisation des performances

## Statut

**ACCEPTÉ** - Implémentation terminée (08-01-2025)

## Contexte

Notre architecture microservices traite divers types de données avec différents patterns d'accès :

- **Données utilisateur** : Profils utilisateur et tokens d'authentification fréquemment accédés
- **Catalogue produits** : Informations produits accédées par plusieurs services
- **Données d'inventaire** : Niveaux de stock en temps réel qui changent fréquemment
- **Analytiques de ventes** : Données agrégées pour les rapports de tableau de bord
- **Gestion de session** : Sessions utilisateur et données de panier d'achat

### Exigences de performance

Le système doit :

- Répondre aux requêtes API en moins de 100ms pour les données mises en cache
- Gérer efficacement les sessions utilisateur simultanées
- Réduire la charge de base de données pour les données fréquemment accédées
- Fournir des mises à jour d'inventaire en temps réel
- Supporter des analytiques de tableau de bord à haut débit

### Exigences de cohérence

Différents types de données ont des exigences de cohérence variables :

- **Sessions utilisateur** : Cohérence forte requise
- **Catalogue produits** : Cohérence éventuelle acceptable
- **Niveaux d'inventaire** : Cohérence quasi temps réel nécessaire
- **Données analytiques** : Cohérence éventuelle acceptable avec TTL court

## Décision

J'implémenterai une **stratégie de mise en cache basée sur Redis** avec l'approche suivante :

### Architecture de cache

- **Redis 7 Alpine** comme couche de mise en cache
- **Cache centralisé** : Instance Redis unique partagée entre tous les services
- **Patterns spécifiques aux services** : Chaque service implémente ses propres patterns de mise en cache
- **Expiration basée sur TTL** : Invalidation de cache basée sur le temps pour la plupart des données
- **Invalidation basée sur événements** : Invalidation immédiate pour les changements de données critiques

### Patterns de mise en cache par service

#### Mise en cache du service utilisateur

```typescript
// Cache des tokens d'authentification
const AUTH_TOKEN_TTL = 3600; // 1 heure
const USER_PROFILE_TTL = 1800; // 30 minutes

// Patterns de cache
const cacheKeys = {
  authToken: (token: string) => `auth:token:${token}`,
  userProfile: (userId: number) => `user:profile:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`
};

// Implémentation
class UserCacheService {
  async cacheAuthToken(token: string, userId: number): Promise<void> {
    await redis.setEx(
      cacheKeys.authToken(token), 
      AUTH_TOKEN_TTL, 
      JSON.stringify({ userId, timestamp: Date.now() })
    );
  }

  async getUserFromToken(token: string): Promise<User | null> {
    const cached = await redis.get(cacheKeys.authToken(token));
    if (cached) {
      const { userId } = JSON.parse(cached);
      return this.getCachedUserProfile(userId);
    }
    return null;
  }
}
```

#### Mise en cache du service catalogue

```typescript
// Cache des produits et inventaire
const PRODUCT_TTL = 3600; // 1 heure (données statiques)
const INVENTORY_TTL = 300; // 5 minutes (données dynamiques)
const STORE_TTL = 7200; // 2 heures (change rarement)

const cacheKeys = {
  allProducts: () => 'catalog:products:all',
  productById: (id: number) => `catalog:product:${id}`,
  storeInventory: (storeId: number) => `catalog:inventory:store:${storeId}`,
  storeInfo: (storeId: number) => `catalog:store:${storeId}`
};

class CatalogCacheService {
  async cacheProductList(products: Product[]): Promise<void> {
    await redis.setEx(
      cacheKeys.allProducts(),
      PRODUCT_TTL,
      JSON.stringify(products)
    );
  }

  async invalidateInventory(storeId: number, productId: number): Promise<void> {
    // Invalider l'inventaire de magasin spécifique
    await redis.del(cacheKeys.storeInventory(storeId));
    
    // Invalider la liste de tous les produits (contient info de stock)
    await redis.del(cacheKeys.allProducts());
  }
}
```

#### Mise en cache du service transaction

```typescript
// Cache des ventes et analytiques
const SALES_HISTORY_TTL = 1800; // 30 minutes
const DASHBOARD_STATS_TTL = 600; // 10 minutes
const REFUND_DATA_TTL = 900; // 15 minutes

const cacheKeys = {
  userSalesHistory: (userId: number) => `sales:history:user:${userId}`,
  dashboardStats: () => 'dashboard:stats:all',
  storePerformance: (storeId: number) => `analytics:store:${storeId}`,
  refundsByUser: (userId: number) => `refunds:user:${userId}`
};

class TransactionCacheService {
  async cacheDashboardStats(stats: DashboardStats): Promise<void> {
    await redis.setEx(
      cacheKeys.dashboardStats(),
      DASHBOARD_STATS_TTL,
      JSON.stringify(stats)
    );
  }

  async invalidateUserTransactions(userId: number): Promise<void> {
    // Invalider les caches spécifiques à l'utilisateur
    await redis.del(cacheKeys.userSalesHistory(userId));
    await redis.del(cacheKeys.refundsByUser(userId));
    
    // Invalider les analytiques globales
    await redis.del(cacheKeys.dashboardStats());
  }
}
```

### Stratégie d'invalidation de cache

1. **Basée sur le temps (TTL)** : Expiration automatique pour la plupart des données mises en cache
2. **Basée sur événements** : Invalidation immédiate quand les données changent
3. **Basée sur patterns** : Invalider les entrées de cache liées en utilisant des patterns de clés
4. **Invalidation sélective** : Invalider seulement les entrées de cache affectées

## Justification

### Pourquoi Redis

1. **Performance** : Stockage en mémoire fournit des temps de réponse sub-milliseconde
2. **Structures de données** : Types de données riches (strings, hashes, listes, sets)
3. **Opérations atomiques** : Opérations thread-safe pour l'accès concurrent
4. **Persistance** : Persistance optionnelle pour les données critiques mises en cache
5. **Clustering** : Capacités de mise à l'échelle horizontale pour la production
6. **Écosystème** : Excellentes librairies client Node.js et outillage

### Pourquoi cache centralisé

1. **Simplicité** : Instance de cache unique réduit la complexité opérationnelle
2. **Cohérence** : État de cache partagé entre tous les services
3. **Efficacité des ressources** : Meilleure utilisation des ressources que des caches par service
4. **Vitesse de développement** : Gestion et débogage de cache simplifiés
5. **Efficacité des coûts** : Instance Redis unique réduit les coûts d'infrastructure

### Pourquoi patterns spécifiques aux services

1. **Connaissance du domaine** : Chaque service connaît le mieux ses patterns d'accès aux données
2. **Optimisation** : Stratégies TTL et d'invalidation spécifiques aux services
3. **Encapsulation** : Détails d'implémentation de cache cachés des autres services
4. **Tests** : Plus facile de tester et valider le comportement de cache par service
5. **Évolution** : Les services peuvent faire évoluer leurs stratégies de cache indépendamment

## Détails d'implémentation

### Configuration Redis

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Implémentation du service de cache

```typescript
// Service de cache partagé
import { createClient } from 'redis';

export class CacheService {
  private client: ReturnType<typeof createClient>;
  private readonly defaultTTL = 3600; // 1 heure

  constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      retry_strategy: (options) => {
        if (options.attempt > 10) return undefined;
        return Math.min(options.attempt * 100, 3000);
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Erreur GET cache:', error);
      return null; // Dégradation gracieuse
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Erreur SET cache:', error);
      // Ne pas lancer - permettre à l'opération de continuer sans cache
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Erreur DEL cache:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Erreur invalidation pattern cache:', error);
    }
  }
}
```

### Cache Middleware

```typescript
// Express middleware for automatic caching
export const createCacheMiddleware = (
  keyGenerator: (req: Request) => string,
  ttl: number = 300
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = keyGenerator(req);
    
    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original res.json to intercept response
    const originalJson = res.json;
    res.json = function(body: any) {
      // Cache the response
      cacheService.set(cacheKey, body, ttl);
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// Usage in routes
app.get('/api/products', 
  createCacheMiddleware(
    (req) => `products:all:${req.query.store || 'all'}`,
    PRODUCT_TTL
  ),
  productController.getAllProducts
);
```

### Monitoring Integration

```typescript
// Cache metrics for Prometheus
import { Counter, Histogram, Gauge } from 'prom-client';

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['service', 'operation']
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['service', 'operation']
});

const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['service', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const cacheConnections = new Gauge({
  name: 'cache_connections_active',
  help: 'Number of active cache connections'
});

// Enhanced cache service with metrics
export class MonitoredCacheService extends CacheService {
  async get<T>(key: string): Promise<T | null> {
    const timer = cacheOperationDuration.startTimer({ 
      service: this.serviceName, 
      operation: 'get' 
    });
    
    try {
      const result = await super.get<T>(key);
      
      if (result !== null) {
        cacheHits.inc({ service: this.serviceName, operation: 'get' });
      } else {
        cacheMisses.inc({ service: this.serviceName, operation: 'get' });
      }
      
      return result;
    } finally {
      timer();
    }
  }
}
```

## Conséquences

### Résultats positifs

1. **Amélioration des performances** : Réduction significative des temps de réponse pour les données mises en cache
2. **Réduction de la charge de base de données** : Diminution de la charge sur PostgreSQL pour les données fréquemment accédées
3. **Scalabilité** : Meilleure gestion des requêtes simultanées
4. **Expérience utilisateur** : Chargement plus rapide des tableaux de bord et navigation produits
5. **Efficacité des ressources** : Utilisation réduite de CPU et mémoire sur les serveurs d'application
6. **Productivité de développement** : Cycles de développement plus rapides avec des données de test mises en cache

### Résultats négatifs

1. **Complexité** : Couche supplémentaire de complexité dans la gestion des données
2. **Défis de cohérence** : Potentiel pour des données obsolètes si l'invalidation de cache échoue
3. **Utilisation mémoire** : Exigences mémoire supplémentaires pour le stockage de cache
4. **Difficulté de débogage** : Plus difficile de tracer les problèmes avec des données mises en cache vs fraîches
5. **Surcharge opérationnelle** : Besoin de surveiller et maintenir l'infrastructure de cache
6. **Dépendance réseau** : Appels réseau supplémentaires pour les opérations de cache

### Atténuation des risques

- **Dégradation gracieuse** : L'application continue de fonctionner si le cache n'est pas disponible
- **Surveillance de cache** : Surveillance complète de la performance et santé du cache
- **Stratégie d'invalidation** : Conception soigneuse des patterns d'invalidation de cache
- **Configuration TTL** : Valeurs TTL appropriées pour équilibrer performance et fraîcheur
- **Gestion d'erreur** : Gestion robuste des erreurs pour les opérations de cache
- **Tests** : Tests complets du comportement de cache et cas limites

## Performance Characteristics

### Expected Performance Gains

- **API Response Time**: 50-80% reduction for cached endpoints
- **Database Load**: 60-70% reduction in database queries
- **Concurrent Users**: 3-5x improvement in concurrent user handling
- **Dashboard Loading**: 70-90% faster dashboard rendering
- **Memory Usage**: <256MB Redis memory usage under normal load

### Cache Hit Rates

- **User Profiles**: 85-95% hit rate (updated infrequently)
- **Product Catalog**: 80-90% hit rate (relatively static)
- **Inventory Data**: 60-70% hit rate (frequently updated)
- **Analytics**: 70-80% hit rate (aggregated data)

### TTL Configuration Rationale

```typescript
const TTL_CONFIG = {
  // Static data - longer TTL
  stores: 7200,      // 2 hours (rarely changes)
  products: 3600,    // 1 hour (updated occasionally)
  
  // Dynamic data - shorter TTL
  inventory: 300,    // 5 minutes (changes frequently)
  userSessions: 1800, // 30 minutes (security consideration)
  
  // Analytics data - medium TTL
  dashboardStats: 600, // 10 minutes (acceptable delay)
  salesHistory: 1800,  // 30 minutes (historical data)
  
  // Authentication data - security-focused TTL
  authTokens: 3600,   // 1 hour (token lifetime)
  userProfiles: 1800  // 30 minutes (profile updates)
};
```

## Alternatives considérées

### 1. Mise en cache au niveau application (Mémoire)

**Avantages :**

- Pas de surcharge réseau
- Plus rapide que Redis
- Implémentation simple

**Inconvénients :**

- Pas partagé entre services
- Limitations de mémoire
- Perdu au redémarrage du service

**Rejeté :** Ne fournit pas de partage de cache cross-service

### 2. Optimisation des requêtes de base de données

**Avantages :**

- Pas d'infrastructure supplémentaire
- Données cohérentes
- Architecture simple

**Inconvénients :**

- Gains de performance limités
- Base de données toujours goulot d'étranglement
- Optimisation de requêtes complexe

**Rejeté :** Insuffisant pour les exigences de performance

### 3. Mise en cache CDN (CloudFlare, AWS CloudFront)

**Avantages :**

- Distribution globale
- Mise à l'échelle automatique
- Mise en cache edge

**Inconvénients :**

- Seulement pour contenu statique
- Dépendance externe
- Pas adapté pour données dynamiques

**Rejeté :** Pas applicable pour la mise en cache d'API

### 4. Memcached

**Avantages :**

- Magasin clé-valeur simple
- Haute performance
- Adoption large

**Inconvénients :**

- Structures de données limitées
- Pas de persistance
- Moins riche en fonctionnalités que Redis

**Rejeté :** Redis fournit plus de fonctionnalités pour une performance similaire

## Monitoring and Validation

### Success Metrics

- **Cache Hit Rate**: Target >80% for most endpoints
- **Response Time**: <50ms for cached responses
- **Memory Usage**: <256MB Redis memory consumption
- **Error Rate**: <1% cache operation failures
- **Database Load**: >60% reduction in database queries

### Validation Approach

- **Performance Testing**: Load testing with and without cache
- **Cache Effectiveness**: Monitoring cache hit rates and performance impact
- **Consistency Testing**: Validate cache invalidation works correctly
- **Failure Testing**: Verify graceful degradation when cache fails
- **Memory Monitoring**: Track Redis memory usage and optimization

### Monitoring Dashboards

```yaml
# Grafana dashboard queries
cache_hit_rate:
  query: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100
  
cache_response_time:
  query: histogram_quantile(0.95, rate(cache_operation_duration_seconds_bucket[5m]))
  
cache_memory_usage:
  query: redis_memory_used_bytes / redis_memory_max_bytes * 100
  
database_load_reduction:
  query: rate(database_queries_total[5m]) compared to baseline
```

## Operational Procedures

### Daily Operations

- Monitor cache hit rates and performance metrics
- Review cache memory usage and optimization opportunities
- Validate cache invalidation is working correctly
- Check for cache-related errors or failures

### Weekly Operations

- Analyze cache effectiveness and adjust TTL values
- Review cache key patterns and optimize as needed
- Validate cache backup and recovery procedures
- Update cache monitoring and alerting thresholds

### Monthly Operations

- Comprehensive cache performance analysis
- Review and optimize cache invalidation strategies
- Validate cache scaling and capacity planning
- Update cache configuration based on usage patterns

## ADRs liés

- [ADR-001: Architecture microservices](./001-microservices-architecture.md)
- [ADR-002: Kong API Gateway](./002-kong-api-gateway.md)
- [ADR-003: Stratégie de base de données partagée](./003-shared-database-strategy.md)
- [ADR-004: Surveillance Prometheus et Grafana](./004-prometheus-grafana-monitoring.md)

## Références

- [Documentation Redis](https://redis.io/docs/)
- [Meilleures pratiques de mise en cache](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/BestPractices.html)
- [Patterns de cache](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Client Redis Node.js](https://github.com/redis/node-redis)
