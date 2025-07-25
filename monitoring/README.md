# Monitoring Setup with Prometheus and Grafana

This monitoring setup provides comprehen3. **Access the dashboards**:

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3004> (admin/admin)

This monitoring setup provides comprehensive observability for the microservices architecture, focusing on the Four Golden Signals of monitoring.

## Architecture

### Components

1. **Prometheus** (Port 9090)
   - Metrics collection and storage
   - Alert rule evaluation
   - Time-series database

2. **Grafana** (Port 3004)
   - Visualization and dashboards
   - Default credentials: admin/admin

3. **Node Exporter** (Port 9100)
   - System-level metrics (CPU, memory, disk, network)

4. **PostgreSQL Exporter** (Port 9187)
   - Database metrics and performance

5. **Redis Exporter** (Port 9121)
   - Cache metrics and performance

## Four Golden Signals Dashboard

The main dashboard focuses on the Four Golden Signals:

### 1. Latency

- **Average Response Time**: Mean response time across all requests
- **95th Percentile**: 95% of requests complete within this time
- **99th Percentile**: 99% of requests complete within this time

### 2. Traffic

- **Requests Per Second**: Rate of incoming requests by service
- **Request Volume**: Total number of requests over time

### 3. Errors

- **Error Rate**: Percentage of requests resulting in 4xx or 5xx responses
- **Error Count**: Total number of errors by service

### 4. Saturation

- **CPU Usage**: Processor utilization percentage
- **Memory Usage**: Memory consumption percentage
- **Active Connections**: Number of active connections per service

## Metrics Collected

### HTTP Metrics

- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total number of HTTP requests
- `http_requests_in_progress` - Current number of requests being processed

### Application Metrics

- `cpu_usage_percent` - CPU utilization by service
- `memory_usage_percent` - Memory usage by service
- `active_connections` - Number of active connections

### Database Metrics

- `db_connections_active` - Active database connections
- `db_query_duration_seconds` - Database query performance
- `pg_up` - PostgreSQL availability

### Cache Metrics

- `cache_hits_total` - Cache hit count
- `cache_misses_total` - Cache miss count
- `redis_up` - Redis availability

### Kong Gateway Metrics

- `kong_http_requests_total` - Total HTTP requests through Kong
- `kong_latency_seconds` - Kong request latency
- `kong_upstream_target_health` - Upstream service health status

## Setup Instructions

1. **Start the monitoring stack**:

   ```bash
   docker-compose up -d prometheus grafana node-exporter postgres-exporter redis-exporter
   ```

2. **Start the application services**:

   ```bash
   docker-compose up -d
   ```

3. **Access the dashboards**:
   - Prometheus: <http://localhost:9090>
   - Grafana: <http://localhost:3004> (admin/admin)

4. **Test the monitoring setup**:

   ```bash
   # Run the monitoring test script
   ./test-monitoring.bat
   ```

## Alerts

The system includes predefined alerts for:

- High error rates (>10%)
- High latency (95th percentile >500ms)
- High CPU usage (>80%)
- High memory usage (>85%)
- Service downtime
- Database connection issues
- High cache miss rates (>80%)
- Kong upstream service health
- Redis/PostgreSQL connectivity issues

## Grafana Dashboard

The Golden Signals dashboard is automatically provisioned and includes:

- Real-time metrics visualization
- Historical trend analysis
- Service-specific breakdowns
- Alert thresholds and indicators

## Metrics Endpoints

Each service exposes metrics at:

- User Service: <http://localhost:3001/metrics>
- Catalog Service: <http://localhost:3002/metrics>
- Transaction Service: <http://localhost:3003/metrics>
- Kong API Gateway: <http://localhost:8000/metrics>

## Database and Cache Metrics

The monitoring setup also includes:

- **PostgreSQL Metrics**: Database performance, connections, queries
- **Redis Metrics**: Cache hit rates, memory usage, connections
- **Kong Gateway Metrics**: Request routing, upstream health, latency

## Troubleshooting

1. **Metrics not appearing**:
   - Check service health endpoints
   - Verify Prometheus targets are UP
   - Ensure services are properly instrumented

2. **Dashboard not loading**:
   - Verify Grafana data source configuration
   - Check Prometheus connectivity
   - Ensure proper provisioning files

3. **High resource usage**:
   - Adjust scrape intervals in prometheus.yml
   - Reduce metrics retention time
   - Monitor container resource limits

## Advanced Configuration

### Custom Metrics

To add custom metrics to your services:

```typescript
import { Counter, Histogram } from 'prom-client';

const customCounter = new Counter({
  name: 'custom_metric_total',
  help: 'Custom metric description',
  labelNames: ['service', 'action']
});

// Increment the counter
customCounter.inc({ service: 'my-service', action: 'custom_action' });
```

### Alert Rules

Add custom alert rules to `monitoring/alert_rules.yml`:

```yaml
- alert: CustomAlert
  expr: custom_metric_total > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert triggered"
    description: "Custom metric exceeded threshold"
```

## Performance Considerations

- **Scrape Interval**: Default 15s, adjust based on requirements
- **Retention**: Prometheus retains data for 200h by default
- **Cardinality**: Be mindful of label cardinality to avoid performance issues
- **Resource Limits**: Set appropriate container resource limits
