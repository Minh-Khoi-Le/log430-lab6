# Catalog Service

The Catalog Service is a microservice responsible for managing products, stores, and inventory (stock) in the retail system. It follows Domain-Driven Design (DDD) principles and Clean Architecture patterns.

## Features

- **Product Management**: Create, read, update, delete, and search products
- **Store Management**: Manage store locations and details
- **Stock Management**: Track inventory levels across stores, handle stock reservations and adjustments
- **Low Stock Monitoring**: Identify products that are running low in inventory

## Architecture

The service follows a layered architecture:

```
catalog-service/
├── domain/                 # Business logic and entities
│   ├── entities/          # Core business objects
│   ├── repositories/      # Repository interfaces
│   └── aggregates/        # Domain aggregates
├── application/           # Use cases and DTOs
│   ├── use-cases/        # Business use cases
│   └── dtos/             # Data transfer objects
├── infrastructure/       # External concerns
│   ├── database/         # Prisma repository implementations
│   └── http/             # HTTP controllers and routes
└── server.ts             # Application entry point
```

## API Endpoints

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/search?name=<query>` - Search products by name
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stores

- `GET /api/stores` - Get all stores
- `GET /api/stores/:id` - Get store by ID
- `GET /api/stores/search?name=<query>` - Search stores by name
- `POST /api/stores` - Create new store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Stock

- `GET /api/stock` - Get all stock records
- `GET /api/stock/:id` - Get stock record by ID
- `GET /api/stock/store/:storeId` - Get stock for a specific store
- `GET /api/stock/product/:productId` - Get stock for a specific product
- `POST /api/stock` - Create new stock record
- `PUT /api/stock/:id` - Update stock quantity
- `POST /api/stock/reserve` - Reserve stock for a sale
- `POST /api/stock/adjust` - Adjust stock levels

## Data Models

### Product

```typescript
{
  id: number;
  name: string;
  price: number;
  description?: string;
}
```

### Store

```typescript
{
  id: number;
  name: string;
  address?: string;
}
```

### Stock

```typescript
{
  id: number;
  storeId: number;
  productId: number;
  quantity: number;
  storeName?: string;
  productName?: string;
  unitPrice?: number;
}
```

## Business Rules

1. **Product Validation**: Products must have a name and non-negative price
2. **Stock Constraints**: Each product can only have one stock record per store
3. **Stock Reservations**: Stock can only be reserved if sufficient quantity is available
4. **Low Stock Threshold**: Default threshold is 10 items, but configurable

## Environment Variables

- `PORT`: Service port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (development/production)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the service
npm run build

# Run in production
npm start

# Run tests
npm test
```

## Database Architecture

The service uses a **centralized database infrastructure** with domain-specific repository patterns:

### Shared Infrastructure

- **Database Manager**: Centralized Prisma client management from `src/shared/infrastructure/database/`
- **Repository Pattern**: Domain-specific interfaces with shared implementations
- **Connection Optimization**: Single shared connection pool across all services

### Domain Boundaries

The Catalog Service has access to:

- **Direct Access**: Product, Store, Stock entities
- **Cross-Domain Access**: None required (maintains strict domain boundaries)

### Repository Interfaces

```typescript
interface IProductRepository extends IBaseRepository<Product, number> {
  findByName(name: string): Promise<Product[]>;
  findByPriceRange(min: number, max: number): Promise<Product[]>;
}

interface IStoreRepository extends IBaseRepository<Store, number> {
  findByName(name: string): Promise<Store[]>;
}

interface IStockRepository extends IBaseRepository<Stock, number> {
  findByStoreId(storeId: number): Promise<Stock[]>;
  findByProductId(productId: number): Promise<Stock[]>;
  findLowStock(threshold: number): Promise<Stock[]>;
  adjustStock(storeId: number, productId: number, quantity: number): Promise<Stock>;
}
```

### Database Schema

The service uses the following Prisma models:

- `Product`: Core product information
- `Store`: Store location details
- `Stock`: Inventory tracking (many-to-many relationship between Product and Store)

## Integration

This service integrates with:

- **API Gateway**: Routes traffic through Kong Gateway
- **Transaction Service**: Provides stock information for sales/refunds
- **User Service**: Authenticates admin users for management operations

## Error Handling

The service provides structured error responses:

- `400 Bad Request`: Invalid input data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors
