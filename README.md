# LOG430 Lab 5 - Retail Store Management System

## Table of Contents

- [LOG430 Lab 5 - Retail Store Management System](#log430-lab-5---retail-store-management-system)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Architecture](#architecture)
    - [Key Architectural Principles](#key-architectural-principles)
  - [Technical Stack](#technical-stack)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Running the Application](#running-the-application)
    - [Manual Startup](#manual-startup)
  - [Local Development](#local-development)
  - [API Gateway](#api-gateway)
    - [Gateway Architecture](#gateway-architecture)
    - [Service Routing](#service-routing)
    - [Security Features](#security-features)
    - [Monitoring Integration](#monitoring-integration)
    - [Configuration Management](#configuration-management)
  - [Monitoring and Observability](#monitoring-and-observability)
    - [Monitoring Stack](#monitoring-stack)
    - [Four Golden Signals](#four-golden-signals)
    - [Starting Monitoring](#starting-monitoring)
  - [Performance Testing](#performance-testing)
    - [Test Scenarios](#test-scenarios)
    - [Running Load Tests](#running-load-tests)
  - [Caching](#caching)
    - [Redis Implementation](#redis-implementation)
    - [Cached Services \& Strategies](#cached-services--strategies)
      - [User Service](#user-service)
      - [Catalog Service](#catalog-service)
      - [Transaction Service](#transaction-service)
    - [Cache Invalidation Strategy](#cache-invalidation-strategy)
    - [Performance Impact](#performance-impact)
  - [Data Management](#data-management)
    - [Centralized Database Architecture](#centralized-database-architecture)
    - [Database Schema](#database-schema)
    - [Database Management](#database-management)
    - [Demo Data Seeding](#demo-data-seeding)
  - [Project Structure](#project-structure)
  - [Available Scripts](#available-scripts)
    - [`quick-start.bat`](#quick-startbat)
    - [`seed-database.bat`](#seed-databasebat)
    - [`start-monitoring.bat`](#start-monitoringbat)
    - [`test-monitoring.bat`](#test-monitoringbat)
    - [`run-tests.bat`](#run-testsbat)
    - [`quick-test.bat`](#quick-testbat)
  - [Features Highlights](#features-highlights)
    - [Admin Dashboard](#admin-dashboard)
    - [Shopping Experience](#shopping-experience)
    - [System Reliability](#system-reliability)
    - [Development Experience](#development-experience)

## Description

This is a comprehensive microservices-based retail store management system built for LOG430 Lab 5. The application demonstrates advanced software architecture principles with a complete solution for managing retail operations including user authentication, product catalog, inventory tracking, sales transactions, and administrative features with full observability and performance testing capabilities.

**Key Features:**

- **Microservices Architecture**: Three domain-focused services (User, Catalog, Transaction) with clean separation of concerns
- **Centralized Database Infrastructure**: Shared PostgreSQL database with domain-specific repository patterns and cross-domain validation
- **User Management**: Role-based authentication system (admin/client) with JWT tokens and secure API access
- **Product Catalog**: Full CRUD operations for products with multi-store inventory management and real-time stock tracking
- **Shopping Cart & E-commerce**: Complete workflow with cart management, checkout, and purchase history
- **Real-time Stock Updates**: Automatic inventory synchronization after purchases with cross-service communication
- **Transaction Management**: Comprehensive sales and refund processing with detailed receipts and business rule validation
- **Admin Dashboard**: Advanced analytics with PDF report generation, store performance metrics, and business insights
- **API Gateway**: Kong Gateway for centralized routing, authentication, rate limiting, and request management
- **Caching Strategy**: Redis-based caching with automatic invalidation and performance optimization
- **Monitoring & Observability**: Full observability with Prometheus, Grafana, and Four Golden Signals monitoring
- **Load Testing**: Comprehensive k6 testing suite with multiple scenarios (spike, stress, endurance, e2e)
- **Modern Frontend**: React 19 with Material-UI v7, responsive design, and modern development stack

## Architecture

The system follows a microservices architecture with comprehensive monitoring and observability, implemented using a centralized database infrastructure pattern for optimal performance and maintainability:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Kong Gateway  │    │   Microservices │
│   (React/Vite)  │◄──►│   (API Gateway) │◄──►│                 │
│   localhost:5173│    │   localhost:8000│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        │                        │
┌─────────────────┐              │             ┌─────────────┐ │
│   Material-UI   │              │             │User Service │ │
│   Components    │              │             │   :3001     │ │
│   + Recharts    │              │             └─────────────┘ │
└─────────────────┘              │                        │
                                 │             ┌─────────────┐ │
                                 │             │Catalog Svc  │ │
                                 │             │   :3002     │ │
                                 │             └─────────────┘ │
                                 │                        │
                                 │             ┌─────────────┐ │
                                 │             │Transaction  │ │
                                 │             │ Service     │ │
                                 │             │   :3003     │ │
                                 │             └─────────────┘ │
                                 │                        │
                                 ▼                        ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │ Load Testing    │    │ Infrastructure  │
                        │                 │    │                 │
                        │ ┌─────────────┐ │    │ ┌─────────────┐ │
                        │ │     k6      │ │    │ │PostgreSQL 15│ │
                        │ │ Test Suite  │ │    │ │  (Shared)   │ │
                        │ └─────────────┘ │    │ └─────────────┘ │
                        └─────────────────┘    │                 │
                                 │             │ ┌─────────────┐ │
                                 │             │ │  Redis 7    │ │
                                 │             │ │  (Cache)    │ │
                                 │             │ └─────────────┘ │
                                 │             └─────────────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌─────────────────┐    ┌─────────────────┐
                        │   Monitoring    │    │ Cross-Domain    │
                        │   Stack         │    │ Validation      │
                        │                 │    │                 │
                        │ ┌─────────────┐ │    │ ┌─────────────┐ │
                        │ │ Prometheus  │ │    │ │Shared Repos │ │
                        │ │   :9090     │ │    │ │& Queries    │ │
                        │ └─────────────┘ │    │ └─────────────┘ │
                        │                 │    │                 │
                        │ ┌─────────────┐ │    │ ┌─────────────┐ │
                        │ │  Grafana    │ │    │ │Domain       │ │
                        │ │   :3004     │ │    │ │Boundaries   │ │
                        │ └─────────────┘ │    │ └─────────────┘ │
                        └─────────────────┘    └─────────────────┘
```

### Key Architectural Principles

1. **Microservices with Bounded Contexts**: Each service owns its domain logic while leveraging shared infrastructure
2. **Centralized Database with Domain Boundaries**: Optimized connection pooling with strict access controls
3. **API Gateway Pattern**: Single entry point for all client requests with centralized security and routing
4. **Caching Strategy**: Multi-level caching with Redis for performance optimization
5. **Observability-First Design**: Comprehensive monitoring built into every component
6. **Performance Testing Integration**: Built-in load testing with k6 for continuous performance validation

## Technical Stack

**Frontend:**

- **React 19** with **Vite 6** build tool for modern development experience
- **Material-UI (MUI) v7** for comprehensive component library and design system
- **React Router DOM v7** for client-side routing and navigation
- **Axios** for HTTP client communication with backend services
- **jsPDF & html2canvas** for PDF report generation and data export
- **Recharts** for data visualization and analytics charts

**Backend Microservices:**

- **Node.js 18+** with **Express.js** framework for robust API development
- **TypeScript** for type safety, better development experience, and maintainability
- **Domain-Driven Design (DDD)** architecture with bounded contexts
- **Clean Architecture** patterns with dependency injection and separation of concerns
- **Shared Infrastructure** pattern for database, caching, logging, and metrics

**API Gateway & Security:**

- **Kong Gateway** for centralized routing, load balancing, and request management
- **API key-based authentication** with consumer management
- **Rate limiting** (300 req/min, 1000 req/hour) and request size limiting (1KB max)
- **CORS support** for cross-origin requests with proper security headers
- **JWT token authentication** for user sessions with role-based access control

**Database & Persistence:**

- **PostgreSQL 15** as primary database with ACID compliance
- **Centralized Database Architecture** with shared connection pooling
- **Prisma ORM v5** for type-safe database access and schema management
- **Cross-domain validation** system for maintaining service boundaries
- **Database migrations** with Prisma Migrate for schema versioning

**Caching & Performance:**

- **Redis 7** for distributed caching and session management
- **Service-specific caching strategies** with automatic cache invalidation
- **Response caching** for frequently accessed data (products, stores, summaries)
- **Performance optimization** with connection pooling and query optimization

**Monitoring & Observability:**

- **Prometheus** for metrics collection, storage, and alerting
- **Grafana** for visualization, dashboards, and monitoring insights
- **Four Golden Signals** monitoring (Latency, Traffic, Errors, Saturation)
- **Node Exporter** for system-level metrics (CPU, memory, disk, network)
- **PostgreSQL Exporter** for database performance metrics
- **Redis Exporter** for cache performance and hit rates
- **Custom application metrics** for business KPIs and performance tracking

**Load Testing & Quality Assurance:**

- **k6** for comprehensive performance and load testing
- **Multiple testing scenarios**: spike tests, stress tests, endurance tests, e2e scenarios
- **Multi-user concurrent testing** for real-world usage simulation
- **Performance benchmarking** with automated test execution

**Containerization & Deployment:**

- **Docker & Docker Compose** for container orchestration and multi-service management
- **Multi-stage builds** for optimized container images
- **Health checks** and dependency management between services
- **Separate networks** for services, monitoring, and external communication
- **Volume management** for persistent data storage

## Quick Start

### Prerequisites

- **Docker & Docker Compose** installed
- **Node.js 18+** for local development (optional)
- **Windows** environment (scripts are .bat files)
- **k6** for load testing (optional)

### Running the Application

The simplest way to start the entire system:

```bash
cd src/scripts
.\quick-start.bat
```

This script will:

1. Stop and clean up any existing containers
2. Build all Docker images
3. Start PostgreSQL, Redis, and all microservices
4. Start Kong API Gateway and wait for it to be ready
5. Run database migrations and seed demo data
6. Launch the web client locally (not in Docker)

### Manual Startup

If you prefer manual control:

```bash
cd src

# Start backend services and monitoring
docker-compose up -d

# Wait for services to be ready, then seed database
docker-compose run --rm db-seed

# Start frontend locally
cd web-client
npm install
npm run dev
```

**Access Points:**

- **Web Client**: <http://localhost:5173>
- **API Gateway**: <http://localhost:8000>
- **Kong Admin**: <http://localhost:8001>
- **Prometheus**: <http://localhost:9090>
- **Grafana**: <http://localhost:3004> (admin/admin)

**Demo Credentials:**

- **Admin**: `admin` / `admin123`
- **Client**: `client` / `client123`

## Local Development

For development without Docker:

```bash
# Start PostgreSQL, Redis, and monitoring via Docker
cd src
docker-compose up -d postgres redis prometheus grafana

# Start User Service
cd services/user-service
npm install
npm run dev

# Start Catalog Service (new terminal)
cd services/catalog-service
npm install
npm run dev

# Start Transaction Service (new terminal)
cd services/transaction-service
npm install
npm run dev

# Start Kong Gateway
docker-compose up -d kong

# Start Web Client (new terminal)
cd web-client
npm install
npm run dev
```

## API Gateway

Kong Gateway serves as the centralized entry point for all client requests, providing comprehensive routing, security, and observability features:

### Gateway Architecture

**Kong Gateway** (Port 8000) acts as a reverse proxy and API gateway with:

- **Centralized routing** to backend microservices
- **Load balancing** and service discovery
- **Security enforcement** through plugins and policies
- **Request/response transformation** and validation
- **Comprehensive logging** and metrics collection

### Service Routing

**Public Endpoints** (no authentication required):

- `GET /api/stores` → `catalog-service:3002` (public store listing)

**Authenticated Endpoints** (require API key `frontend-app-key-12345`):

- `/api/auth/*` → `user-service:3001` (authentication and registration)
- `/api/users/*` → `user-service:3001` (user profile management)
- `/api/products/*` → `catalog-service:3002` (product catalog operations)
- `/api/stock/*` → `catalog-service:3002` (inventory management)
- `/api/sales/*` → `transaction-service:3003` (sales transactions)
- `/api/refunds/*` → `transaction-service:3003` (refund processing)

### Security Features

**API Key Authentication:**

- **Frontend API Key**: `frontend-app-key-12345` for web client access
- **Consumer Management**: Each client registered as Kong consumer
- **Header-based Authentication**: `X-API-Key` header required for protected endpoints

**Rate Limiting & Protection:**

- **Rate Limits**: 300 requests/minute, 1000 requests/hour per consumer
- **Request Size Limiting**: 1KB maximum payload size for security
- **CORS Configuration**: Proper cross-origin resource sharing for web clients
- **Security Headers**: Helmet.js integration for additional security headers

**Traffic Management:**

- **Request Queuing**: Handles traffic spikes with proper queuing
- **Circuit Breaker**: Automatic failover and service protection
- **Retry Logic**: Intelligent retry mechanisms for transient failures

### Monitoring Integration

**Prometheus Plugin:**

- **Request Metrics**: All HTTP requests tracked with response times and status codes
- **Service Health**: Backend service availability and health monitoring
- **Gateway Performance**: Kong-specific metrics (latency, throughput, errors)
- **Consumer Analytics**: Per-consumer usage statistics and patterns

**Metrics Collected:**

- `kong_http_requests_total` - Total HTTP requests by service, method, status
- `kong_latency_seconds` - Request latency distribution
- `kong_bandwidth_bytes` - Request/response sizes and bandwidth usage
- `kong_upstream_target_health` - Backend service health status

### Configuration Management

**Kong Configuration** (`kong/kong.yml`):

- **Declarative Configuration**: Version-controlled Kong setup
- **Service Definitions**: Backend service endpoints and health checks
- **Route Mappings**: URL pattern matching and request routing
- **Plugin Configuration**: Security, logging, and monitoring plugins
- **Consumer Setup**: API key management and rate limiting policies

**Admin API** (Port 8001):

- **Configuration Management**: Dynamic configuration updates
- **Health Monitoring**: Gateway and service health status
- **Analytics**: Real-time traffic and performance analytics
- **Certificate Management**: SSL/TLS certificate handling

## Monitoring and Observability

The system implements comprehensive monitoring based on the Four Golden Signals:

### Monitoring Stack

**Prometheus** (Port 9090):

- Metrics collection and storage
- Alert rule evaluation
- Time-series database

**Grafana** (Port 3004):

- Visualization dashboards
- Default credentials: admin/admin
- Pre-configured dashboards for all services

**Exporters**:

- Node Exporter (Port 9100) - System metrics
- PostgreSQL Exporter (Port 9187) - Database metrics
- Redis Exporter (Port 9121) - Cache metrics

### Four Golden Signals

1. **Latency**: Response time metrics (average, 95th, 99th percentile)
2. **Traffic**: Requests per second by service
3. **Errors**: Error rate and count by service and endpoint
4. **Saturation**: CPU, memory, disk, and network utilization

### Starting Monitoring

```bash
cd src/scripts
.\start-monitoring.bat
```

Access dashboards at:

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3004>

## Performance Testing

Comprehensive k6 load testing suite with multiple scenarios:

### Test Scenarios

- **auth-test.js**: Authentication endpoint testing
- **product-test.js**: Product catalog performance
- **sales-test.js**: Sales transaction testing
- **comprehensive-test.js**: All endpoints testing
- **e2e-scenario.js**: End-to-end user journey
- **spike-test.js**: Spike load testing
- **multi-user-scenario.js**: Multi-user concurrent testing
- **high-concurrency-stress.js**: High-concurrency stress testing

### Running Load Tests

```bash
cd k6/scripts
.\run-tests.bat
```

Or run specific tests:

```bash
cd k6
k6 run tests/comprehensive-test.js
```

**Prerequisites**: Install k6 from <https://k6.io/docs/getting-started/installation/>

## Caching

The system implements a comprehensive caching strategy using Redis to optimize performance across all services:

### Redis Implementation

- **Redis 7** as distributed cache server (Port 6379)
- **Connection pooling** for efficient resource utilization
- **Automatic cache invalidation** on data mutations
- **TTL-based expiration** for data consistency
- **Service-specific caching strategies** tailored to each domain

### Cached Services & Strategies

#### User Service

- **Authentication tokens**: Session-based caching for reduced database lookups
- **User profiles**: Cached user information for frequent access patterns

#### Catalog Service

- **Product listings**: `GET /api/products` cached for 5 minutes (300s TTL)
- **Product details**: Individual product pages cached for 10 minutes
- **Product search results**: Search queries cached for 2 minutes
- **Store information**: Store data cached for 15 minutes
- **Stock levels**: Real-time stock data with 1-minute TTL for accuracy

#### Transaction Service

- **Sales summaries**: Transaction reports cached for 5 minutes
- **Transaction lists**: User and store transaction history cached for 3 minutes
- **Refund data**: Refund information cached with automatic invalidation

### Cache Invalidation Strategy

**Automatic Invalidation Triggers:**

- Product creation/update → Invalidates product lists and search caches
- Stock adjustments → Invalidates stock-related caches
- New sales/refunds → Invalidates transaction summaries and lists
- User profile updates → Invalidates user-specific caches

**Cache Key Patterns:**

- `GET:/api/products` → Product listing cache
- `GET:/api/products/{id}` → Individual product cache
- `GET:/api/sales/summary` → Sales summary cache
- `GET:/api/stock/store/{storeId}` → Store-specific stock cache

### Performance Impact

- **Response time reduction**: 60-80% faster response times for cached endpoints
- **Database load reduction**: Significant reduction in database queries for read operations
- **Improved scalability**: Better handling of concurrent requests
- **Enhanced user experience**: Faster page loads and data retrieval

## Data Management

### Centralized Database Architecture

The system implements a **centralized database infrastructure** with domain-specific access patterns to balance performance and maintainability:

**Architecture Benefits:**

- **Shared Connection Pool**: Single PostgreSQL connection pool optimized for all services
- **Domain Boundaries**: Strict access controls ensuring services only access their designated entities
- **Cross-Domain Validation**: Controlled inter-service data validation through dedicated interfaces
- **Transaction Management**: ACID compliance across service boundaries when needed
- **Performance Optimization**: Reduced connection overhead and improved query optimization

### Database Schema

**Core Entities:**

- **Users**: Authentication and user profiles with role-based access (`admin`/`client`)
- **Stores**: Physical store locations with addresses and operational details
- **Products**: Product catalog with pricing, descriptions, and categorization
- **Stock**: Per-store inventory levels (junction table with quantity tracking)
- **Sales**: Transaction records with comprehensive line item details
- **SaleLines**: Individual product line items in sales with unit prices
- **Refunds**: Refund processing with detailed tracking and business rules
- **RefundLines**: Individual product line items in refunds with validation

**Domain Access Patterns:**

- **User Service**: Direct access to `User` entities, cross-domain validation only
- **Catalog Service**: Direct access to `Product`, `Store`, `Stock` entities
- **Transaction Service**: Direct access to `Sale`, `SaleLine`, `Refund`, `RefundLine` entities

**Key Relationships:**

- Users ↔ Sales (one-to-many with foreign key constraints)
- Stores ↔ Sales (one-to-many with location tracking)
- Products ↔ Stock (many-to-many via Stock junction table)
- Sales ↔ SaleLines (one-to-many with cascade delete)
- Sales ↔ Refunds (one-to-many with business rule validation)

### Database Management

**Migration Strategy:**

- **Prisma Migrate**: Automated schema migrations via Docker containers
- **Version Control**: All migrations tracked in `prisma/migrations/`
- **Zero-Downtime Deployment**: Migrations designed for production rollouts
- **Rollback Support**: Safe rollback procedures for schema changes

**Connection Management:**

- **Shared Database Manager**: Centralized connection handling in `src/shared/infrastructure/database/`
- **Connection Pooling**: Optimized pool size and connection lifecycle management
- **Health Monitoring**: Database health checks and connection monitoring
- **Graceful Shutdown**: Proper connection cleanup on service termination

### Demo Data Seeding

The system includes comprehensive demo data for testing:

**Users:**

- Admin user: `admin` / `admin123` (full system access)
- Client user: `client` / `client123` (customer access)

**Stores:**

- 3 sample stores: Downtown Store, Mall Store, Airport Store
- Complete with addresses and contact information

**Products:**

- 25+ sample products across multiple categories
- Electronics, Home goods, Clothing, Sports equipment
- Realistic pricing and descriptions

**Inventory:**

- Pre-configured stock levels for each store
- Realistic quantity distributions
- Varied availability across stores

**To manually reseed the database:**

```bash
cd src/scripts
.\seed-database.bat
```

## Project Structure

```text
log430-lab6/
├── README.md                    # Project documentation and setup guide
├── docs/                        # Comprehensive project documentation
│   ├── arc42-report.md         # Architecture documentation (Arc42 format)
│   ├── adr/                    # Architecture Decision Records (ADRs)
│   │   ├── 001-microservices-architecture.md
│   │   ├── 002-kong-api-gateway.md
│   │   ├── 003-shared-database-strategy.md
│   │   ├── 004-prometheus-grafana-monitoring.md
│   │   ├── 005-redis-caching-strategy.md
│   │   └── 006-centralized-database-architecture.md
│   └── diagrams/               # UML diagrams (PlantUML format)
│       ├── architecture-systeme.puml
│       ├── diagramme-classe.puml
│       ├── diagramme-CU.puml
│       ├── diagramme-deploiement.puml
│       └── MDD.puml
├── k6/                         # Comprehensive load testing suite
│   ├── config/                 # Test configurations and environments
│   │   ├── config.js           # Main k6 configuration
│   │   └── environments.js     # Environment-specific settings
│   ├── tests/                  # Individual service test files
│   │   ├── auth-test.js        # Authentication endpoint testing
│   │   ├── product-test.js     # Catalog service testing
│   │   ├── stock-test.js       # Inventory management testing
│   │   ├── sales-test.js       # Transaction service testing
│   │   └── comprehensive-test.js # Full system testing
│   ├── scenarios/              # Complex load testing scenarios
│   │   ├── e2e-scenario.js     # End-to-end user journeys
│   │   ├── spike-test.js       # Spike load testing
│   │   ├── high-concurrency-stress.js # Stress testing
│   │   └── connection-persistence.js # Long-running sessions
│   ├── utils/                  # Testing utilities and helpers
│   │   ├── helpers.js          # Common utility functions
│   │   └── auth.js             # Authentication utilities
│   └── scripts/                # Test execution scripts
│       ├── run-tests.bat       # Main test runner
│       └── quick-test.bat      # Quick validation tests
├── monitoring/                 # Observability and monitoring stack
│   ├── prometheus.yml          # Prometheus configuration
│   ├── alert_rules.yml         # Alert rule definitions
│   ├── README.md               # Monitoring setup guide
│   └── grafana/                # Grafana configuration
│       ├── dashboards/         # Pre-built dashboards
│       │   ├── golden-signals.json
│       │   └── system-overview.json
│       └── provisioning/       # Automatic provisioning config
└── src/                        # Main application source code
    ├── docker-compose.yml      # Container orchestration configuration
    ├── package.json            # Root package dependencies
    ├── api-gateway/            # Kong Gateway configuration
    │   ├── config/             # Gateway configuration files
    │   │   └── gateway.conf    # Kong proxy configuration
    │   └── kong/               # Kong service definitions
    │       ├── kong.yml        # Declarative Kong configuration
    │       └── plugins/        # Custom Kong plugins
    ├── services/               # Microservices implementation
    │   ├── user-service/       # Authentication & user management service
    │   │   ├── server.ts       # Service entry point and setup
    │   │   ├── application/    # Use cases and application logic
    │   │   │   ├── use-cases/  # Business use case implementations
    │   │   │   └── dtos/       # Data Transfer Objects
    │   │   ├── domain/         # Domain entities and business logic
    │   │   │   ├── entities/   # Domain entities (User, etc.)
    │   │   │   └── repositories/ # Repository interfaces
    │   │   ├── infrastructure/ # External concerns (HTTP, DB, etc.)
    │   │   │   ├── database/   # Repository implementations
    │   │   │   └── http/       # REST controllers
    │   │   ├── __tests__/      # Unit and integration tests
    │   │   └── README.md       # Service-specific documentation
    │   ├── catalog-service/    # Product catalog & inventory management
    │   │   ├── server.ts       # Service entry point
    │   │   ├── application/    # Product, Store, Stock use cases
    │   │   ├── domain/         # Catalog domain entities
    │   │   ├── infrastructure/ # Database and HTTP infrastructure
    │   │   ├── __tests__/      # Service tests
    │   │   └── README.md       # Catalog service documentation
    │   ├── transaction-service/ # Sales & refund processing
    │   │   ├── server.ts       # Service entry point
    │   │   ├── application/    # Sale and Refund use cases
    │   │   ├── domain/         # Transaction domain entities
    │   │   ├── infrastructure/ # Repository and controller implementations
    │   │   ├── __tests__/      # Transaction service tests
    │   │   └── README.md       # Transaction service documentation
    │   ├── db-migrate/         # Database migration container
    │   │   └── Dockerfile      # Migration container definition
    │   └── db-seeder/          # Database seeding container
    │       ├── seed.js         # Data seeding script
    │       ├── package.json    # Seeder dependencies
    │       └── README.md       # Seeding documentation
    ├── shared/                 # Shared infrastructure and utilities
    │   ├── index.ts            # Shared exports
    │   ├── application/        # Base interfaces and patterns
    │   │   └── interfaces/     # Common application interfaces
    │   ├── domain/             # Shared domain concepts
    │   │   ├── entities/       # Base entity classes
    │   │   └── events/         # Domain events
    │   └── infrastructure/     # Shared infrastructure services
    │       ├── database/       # Centralized database management
    │       │   ├── database-manager.ts
    │       │   ├── cross-domain-queries.ts
    │       │   └── base-repository.ts
    │       ├── caching/        # Redis caching infrastructure
    │       │   ├── cache-service.ts
    │       │   ├── redis-client.ts
    │       │   └── README.md
    │       ├── logging/        # Centralized logging
    │       │   ├── logger.ts
    │       │   └── README.md
    │       ├── metrics/        # Prometheus metrics collection
    │       │   └── metrics.ts
    │       └── http/           # HTTP client utilities
    │           └── http-client.ts
    ├── web-client/             # React frontend application
    │   ├── index.html          # Main HTML template
    │   ├── vite.config.js      # Vite build configuration
    │   ├── package.json        # Frontend dependencies
    │   ├── Dockerfile          # Frontend container (optional)
    │   ├── nginx.conf          # Nginx configuration for production
    │   ├── public/             # Static assets and public files
    │   └── src/                # Frontend source code
    │       ├── main.jsx        # Application entry point
    │       ├── App.jsx         # Main App component
    │       ├── components/     # Reusable UI components
    │       │   ├── common/     # Common UI elements
    │       │   ├── forms/      # Form components
    │       │   └── layout/     # Layout components
    │       ├── pages/          # Page-level components
    │       │   ├── Dashboard.jsx # Admin analytics dashboard
    │       │   ├── Products.jsx  # Product catalog management
    │       │   ├── Sales.jsx     # Sales transaction management
    │       │   ├── Refunds.jsx   # Refund processing interface
    │       │   ├── CartPage.jsx  # Shopping cart interface
    │       │   └── LoginPage.jsx # User authentication
    │       ├── context/        # React context providers
    │       │   ├── AuthContext.jsx
    │       │   └── CartContext.jsx
    │       ├── api/            # API communication layer
    │       │   ├── auth.js     # Authentication API calls
    │       │   ├── products.js # Product-related API calls
    │       │   ├── sales.js    # Sales API calls
    │       │   └── config.js   # API configuration
    │       └── hooks/          # Custom React hooks
    │           ├── useAuth.js
    │           └── useCart.js
    ├── prisma/                 # Database schema and migrations
    │   ├── schema.prisma       # Complete database schema definition
    │   └── migrations/         # Database migration history
    │       ├── migration_lock.toml
    │       └── 20250704033539_init/ # Initial migration
    └── scripts/                # Automation and utility scripts
        ├── quick-start.bat     # Complete system startup script
        ├── seed-database.bat   # Database seeding script
        ├── run-all-tests.bat   # Execute all tests (k6 + unit tests)
        ├── test-monitoring.bat # Validate monitoring setup
        └── README.md           # Scripts documentation
```

## Available Scripts

**Located in `src/scripts/`:**

### `quick-start.bat`

Complete system startup script that:

- Stops and cleans existing containers
- Builds all Docker images
- Starts all services (database, cache, microservices, Kong)
- Waits for Kong to be ready
- Seeds database with demo data
- Starts frontend locally

### `seed-database.bat`

Database seeding script that:

- Runs database migrations
- Seeds demo data (users, stores, products, inventory)
- Useful for resetting demo data

### `start-monitoring.bat`

Monitoring stack startup script that:

- Starts Prometheus, Grafana, and all exporters
- Configures dashboards and data sources
- Useful for development and testing

### `test-monitoring.bat`

Monitoring validation script that:

- Tests all monitoring endpoints
- Validates metrics collection
- Useful for troubleshooting

**Located in `k6/scripts/`:**

### `run-tests.bat`

Comprehensive load testing script that:

- Runs all k6 test scenarios
- Generates performance reports
- Tests system under various load conditions

### `quick-test.bat`

Quick validation script that:

- Runs basic endpoint tests
- Validates system functionality
- Useful for smoke testing

**Frontend Scripts (in `src/web-client/`):**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Service Scripts (in each service directory):**

- `npm run dev` - Start service in development mode
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production build
- `npm test` - Run unit tests

**Root Scripts (in `src/`):**

- `npm run start:all` - Start all services concurrently
- `npm run build:all` - Build all services
- `npm run install:all` - Install dependencies for all services
- `npm run test:all` - Run all service tests

## Features Highlights

### Admin Dashboard

- **Comprehensive Analytics**: Store performance, sales metrics, revenue analysis
- **PDF Report Generation**: Export detailed performance reports using jsPDF
- **Real-time Data**: Live updates from all microservices
- **Four Golden Signals**: Latency, traffic, errors, and saturation metrics

### Shopping Experience

- **Modern UI**: Material-UI components with responsive design
- **Real-time Cart**: Live inventory updates and cart management
- **Secure Checkout**: JWT-based authentication and secure transactions
- **Order History**: Complete transaction history with detailed receipts

### System Reliability

- **Health Checks**: All services have health check endpoints
- **Graceful Degradation**: Fallback mechanisms for service failures
- **Monitoring**: Comprehensive observability with alerting
- **Load Testing**: Automated performance validation

### Development Experience

- **TypeScript**: Full type safety across all services
- **Docker**: Consistent development and deployment environment
- **Hot Reload**: Development servers with automatic reload
- **Testing**: Unit tests and comprehensive load testing suite
