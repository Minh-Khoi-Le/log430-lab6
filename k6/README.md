# k6 Load Testing Suite for LOG430 Lab 5

This directory contains a comprehensive k6 load testing suite for the LOG430 Lab 5 Retail Store Management System. The suite is designed to test the performance and reliability of the microservices architecture under various load conditions.

## System Architecture

The system consists of the following microservices:

- **User Service** (Port 3001) - Authentication and user management
- **Catalog Service** (Port 3002) - Product catalog and inventory management
- **Transaction Service** (Port 3003) - Sales transactions and refunds
- **API Gateway** (Kong - Port 8000) - Request routing and authentication
- **Web Client** (Port 5173) - Frontend application

## Directory Structure

``` text
k6/
├── config/
│   ├── config.js           # Main configuration file
│   └── environments.js     # Environment-specific configurations
├── tests/
│   ├── auth-test.js        # Authentication endpoints testing
│   ├── product-test.js     # Product catalog testing
│   ├── stock-test.js       # Stock management testing
│   ├── sales-test.js       # Sales transaction testing
│   └── comprehensive-test.js # All endpoints testing
├── scenarios/
│   ├── e2e-scenario.js     # End-to-end user journey testing
│   ├── spike-test.js       # Spike load testing
│   ├── multi-user-scenario.js # Multi-user concurrent testing
│   ├── high-concurrency-stress.js # High-concurrency stress testing
│   └── connection-persistence.js # Long-running session testing
├── utils/
│   ├── helpers.js          # Common utility functions
│   └── auth.js             # Authentication utilities
├── scripts/
│   ├── run-tests.bat       # Main test runner script
│   └── quick-test.bat      # Quick validation script
└── README.md
```

## Prerequisites

### 1. Install k6

```bash
# Windows (using chocolatey)
choco install k6

# Windows (using scoop)
scoop install k6

# macOS (using homebrew)
brew install k6

# Linux (using package manager)
sudo apt-get update
sudo apt-get install k6
```

### 2. System Requirements

- Ensure the LOG430 Lab 5 system is running
- API Gateway should be accessible at `http://localhost:8000`
- All microservices should be healthy and responding

### 3. Start the System

```bash
# Navigate to the src directory
cd src

# Start all services using Docker Compose
docker-compose up

# Or start individual services
npm run start:all
```

## Quick Start

### Windows Users

1. Open Command Prompt or PowerShell
2. Navigate to the k6 directory: `cd k6`
3. Run the quick test:

   ```batch
   scripts\quick-test.bat
   ```

### Manual Execution

```bash
# Navigate to the k6 directory
cd k6

# Run a basic smoke test
k6 run --env BASE_URL=http://localhost:8000 --env API_KEY=frontend-app-key-12345 tests/auth-test.js

# Run comprehensive test
k6 run --env BASE_URL=http://localhost:8000 --env API_KEY=frontend-app-key-12345 tests/comprehensive-test.js
```

### Running from Scripts Directory

If you're already in the scripts directory, use:

```batch
# From k6\scripts directory
quick-test.bat
run-tests.bat
```

## Test Types

### 1. Smoke Tests

**Purpose**: Verify basic functionality with minimal load
**Command**: `k6 run --stage 1m:5 tests/auth-test.js`
**Expected**: All tests pass, response times < 2s

### 2. Load Tests

**Purpose**: Test system under normal expected load
**Command**: `k6 run tests/comprehensive-test.js`
**Expected**: Response times < 1.5s, error rate < 5%

### 3. Stress Tests

**Purpose**: Test system beyond normal capacity
**Command**: `k6 run scenarios/e2e-scenario.js`
**Expected**: Response times < 3s, error rate < 10%

### 4. Spike Tests

**Purpose**: Test sudden traffic increases
**Command**: `k6 run scenarios/spike-test.js`
**Expected**: System recovers quickly, error rate < 20%

### 5. Soak Tests

**Purpose**: Test sustained load over extended periods
**Command**: `k6 run --stage 2m:20 --stage 30m:20 --stage 2m:0 tests/comprehensive-test.js`
**Expected**: No memory leaks, stable performance

### 6. Multi-User Concurrent Tests

**Purpose**: Simulate multiple users connected simultaneously with realistic behavior patterns
**Command**: `k6 run scenarios/multi-user-scenario.js`
**Expected**: Response times < 3s, error rate < 12%

**Features**:

- 70% customers, 25% managers, 5% admins
- Realistic user behavior patterns
- Sustained concurrent connections
- Peak traffic simulation

### 7. High-Concurrency Stress Tests

**Purpose**: Test system limits with extreme load (up to 200 concurrent users)
**Command**: `k6 run scenarios/high-concurrency-stress.js`
**Expected**: Response times < 5s, error rate < 25%
**Warning**: May cause system performance degradation

### 8. Connection Persistence Tests

**Purpose**: Simulate long-running user sessions (15-30 minutes per user)
**Command**: `k6 run scenarios/connection-persistence.js`
**Expected**: Response times < 2s, error rate < 8%
**Duration**: Approximately 1 hour

## Critical Endpoints Tested

### High-Frequency Endpoints

- `GET /api/products` - Product catalog browsing
- `GET /api/products/search` - Product search
- `GET /api/stock` - Stock level checking
- `GET /api/stores` - Store location listing
- `POST /api/auth/login` - User authentication

### Medium-Frequency Endpoints

- `GET /api/sales/user/{id}` - User purchase history
- `GET /api/stock/store/{id}` - Store inventory
- `GET /api/sales/summary` - Sales reporting
- `POST /api/sales` - Purchase transactions

### Low-Frequency Endpoints

- `POST /api/products` - Product creation
- `PUT /api/stock/{id}` - Stock updates
- `POST /api/refunds` - Refund processing
- `PUT /api/products/{id}` - Product updates

## Configuration

### Environment Variables

```bash
BASE_URL=http://localhost:8000    # API Gateway URL
API_KEY=frontend-app-key-12345    # API key for authentication
ENVIRONMENT=local                 # Environment (local, docker, ci, staging)
TEST_TYPE=load                    # Test type (smoke, load, stress, spike, soak)
```

### Performance Thresholds

```javascript
// Default thresholds
http_req_duration: ['p(95)<2000']  // 95% of requests < 2s
http_req_failed: ['rate<0.1']      // Error rate < 10%
http_reqs: ['rate>1']              // Request rate > 1 RPS
checks: ['rate>0.9']               // Success rate > 90%
```

## Results Interpretation

### Key Metrics to Monitor

1. **Response Time** - Should be under 2 seconds for most endpoints
2. **Error Rate** - Should be below 5% under normal load
3. **Throughput** - Requests per second the system can handle
4. **Resource Usage** - CPU, memory, and database connections

### Success Criteria

- **Smoke Test**: All endpoints respond correctly
- **Load Test**: System handles expected traffic smoothly
- **Stress Test**: System degrades gracefully under high load
- **Spike Test**: System recovers from traffic spikes
- **Soak Test**: No memory leaks or performance degradation

## Test Scenarios

### Customer Shopping Journey

1. User authentication
2. Browse product catalog
3. Search for specific products
4. Check store locations
5. View product details
6. Check stock availability
7. Make a purchase
8. View purchase history

### Manager Dashboard Journey

1. Manager authentication
2. Check dashboard metrics
3. Review sales data
4. Check inventory levels
5. Review low stock items
6. Update stock levels
7. Review refunds

## Troubleshooting

### Common Issues

1. **k6 not found**
   - Install k6 using package manager
   - Add k6 to system PATH

2. **System not responding**
   - Ensure Docker containers are running
   - Check if all services are healthy
   - Verify API Gateway is accessible

3. **Authentication failures**
   - Check API key configuration
   - Verify test user credentials
   - Ensure user service is running

4. **High error rates**
   - Reduce concurrent users
   - Increase think time between requests
   - Check system resources

### Debug Commands

```bash
# Check system health
curl http://localhost:8000/health

# Check API Gateway admin
curl http://localhost:8001/

# Check service logs
docker-compose logs -f catalog-service
docker-compose logs -f user-service
docker-compose logs -f transaction-service
```

## Test Execution Checklist

Before running tests:

- [ ] System is running and healthy
- [ ] All services are accessible
- [ ] Database is seeded with test data
- [ ] API Gateway is configured correctly
- [ ] Monitoring tools are running (optional)

## Additional Documentation

For detailed information about multi-user testing capabilities, see:

- [Multi-User Testing Guide](MULTI_USER_TESTING.md) - Comprehensive guide to concurrent user testing
- [Configuration Reference](config/config.js) - Complete configuration options
- [Test Results Analysis](../monitoring/README.md) - How to analyze test results with Grafana

## Performance Expectations

### Normal Load (< 50 users)

- Response times: < 2 seconds
- Error rate: < 5%
- CPU usage: < 60%
- Memory usage: < 70%

### High Load (50-100 users)

- Response times: < 3 seconds
- Error rate: < 10%
- CPU usage: < 80%
- Memory usage: < 80%

### Stress Load (100+ users)

- Response times: < 5 seconds
- Error rate: < 25%
- System may show performance degradation
- Monitor for recovery after load reduction

## Integration with Monitoring

The k6 tests integrate with the existing monitoring stack:

- **Prometheus**: Collects metrics during test execution
- **Grafana**: Visualizes performance during tests
- **Alert Manager**: Triggers alerts when thresholds are exceeded

Run tests while monitoring the Grafana dashboards to get real-time insights into system performance.

## Related Documentation

- [k6 Documentation](https://k6.io/docs/)
- [LOG430 Lab 5 System Documentation](../README.md)
- [API Gateway Configuration](../src/api-gateway/README.md)
- [Microservices Architecture](../docs/architecture.md)

---
