# LOG430 Lab 6 Scripts

This directory contains utility scripts for managing the LOG430 Lab 6 microservices architecture.

## Available Scripts

- `quick-start.bat` - Stops, builds, and starts all backend services (Postgres, Redis, microservices, Kong API Gateway, seeds DB) and automatically launches the web client locally on your machine (not in Docker)
- `seed-database.bat` - Rebuilds the db-seed image and forcefully reseeds the database with demo data
- `test-monitoring.bat` - Runs basic checks to verify that Prometheus, Grafana, and service metrics endpoints are up and collecting data.
- `run-all-tests.bat` - Runs all unit tests for every microservice (User, Catalog, Transaction) and prints a summary of results for each service.

### Run All Tests

To run all unit tests for every microservice and see a summary of results:

```batch
.\run-all-tests.bat
```

This will:

1. Run `npm test` in each service folder (User, Catalog, Transaction)
2. Show the actual test output for each service
3. Print a summary of passed/failed services at the end

## Usage

### Quick Start

To start the entire system in one command:

```batch
.\quick-start.bat
```

This will:

1. Stop and clean up any running containers
2. Build all Docker images
3. Start Postgres, Redis, all microservices (User, Catalog, Transaction), and Kong API Gateway
4. Wait for Kong to be ready
5. Seed the database with demo data
6. Launch the web client locally in a new terminal window using `npm run dev`

### Seeding the Database

To force a full reseed of the database (clears all data and reloads demo data):

```batch
.\seed-database.bat
```

### Test Monitoring

To verify that monitoring is working:

```batch
.\test-monitoring.bat
```

This will:

- Check Prometheus targets
- Check service `/metrics` endpoints
- Make test requests to generate metrics

### Stopping All Services

To stop all services and clean up:

```batch
docker-compose down -v
```

## Access Points

After starting the system:

- Web Client: [http://localhost:5173](http://localhost:5173)
- API Gateway: [http://localhost:8000](http://localhost:8000)
- API Admin: [http://localhost:8001](http://localhost:8001)
- Prometheus: [http://localhost:9090](http://localhost:9090)
- Grafana: [http://localhost:3004](http://localhost:3004) (admin/admin)

## Troubleshooting

If services fail to start:

1. Try stopping all services first: `docker-compose down -v`
2. Check Docker logs: `docker-compose logs -f [service-name]`
3. Ensure Redis is running: `docker ps | findstr redis`
4. Check if required ports are available (3001-3003, 5173, 6379, 8000, 8001, 9090, 3004)

If experiencing cache-related issues:

1. Restart Redis: `docker-compose restart redis`
2. Restart the affected service(s) to reconnect to Redis: `docker-compose restart [service-name]`
