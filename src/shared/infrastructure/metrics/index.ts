import client from 'prom-client';

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: 'nodejs_'
});

// HTTP request metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

const httpRequestsInProgress = new client.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route', 'service']
});

// Application metrics
const cpuUsage = new client.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
  labelNames: ['service']
});

const memoryUsage = new client.Gauge({
  name: 'memory_usage_percent',
  help: 'Memory usage percentage',
  labelNames: ['service']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service']
});

// Database metrics
const dbConnections = new client.Gauge({
  name: 'db_connections',
  help: 'Number of active database connections',
  labelNames: ['service']
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['service', 'query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Cache metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['service']
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['service']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestsInProgress);
register.registerMetric(cpuUsage);
register.registerMetric(memoryUsage);
register.registerMetric(activeConnections);
register.registerMetric(dbConnections);
register.registerMetric(dbQueryDuration);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);

export {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInProgress,
  cpuUsage,
  memoryUsage,
  activeConnections,
  dbConnections,
  dbQueryDuration,
  cacheHits,
  cacheMisses
};

export * from './middleware';
