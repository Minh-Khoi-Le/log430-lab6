# Transaction Service

The Transaction Service is a microservice responsible for managing sales and refunds in the retail system. It follows Domain-Driven Design (DDD) principles and Clean Architecture patterns.

## Features

- **Sales Management**: Create, read, update sales transactions with line items
- **Refunds Management**: Process refunds with validation against original sales
- **Transaction Tracking**: Track transaction history by user, store, and date ranges
- **Business Rules**: Enforce refund policies and transaction integrity
- **Reporting**: Generate sales and refunds summaries with analytics

## Architecture

The service follows a layered architecture:

```
transaction-service/
├── domain/                 # Business logic and entities
│   ├── entities/          # Core business objects (Sale, Refund, Lines)
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

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID
- `GET /api/sales/user/:userId` - Get sales by user
- `GET /api/sales/store/:storeId` - Get sales by store
- `GET /api/sales/summary?startDate=&endDate=` - Get sales summary
- `POST /api/sales` - Create new sale
- `PUT /api/sales/:id/status` - Update sale status

### Refunds
- `GET /api/refunds` - Get all refunds
- `GET /api/refunds/:id` - Get refund by ID
- `GET /api/refunds/user/:userId` - Get refunds by user
- `GET /api/refunds/store/:storeId` - Get refunds by store
- `GET /api/refunds/sale/:saleId` - Get refunds for a specific sale
- `GET /api/refunds/summary?startDate=&endDate=` - Get refunds summary
- `POST /api/refunds` - Create new refund

## Data Models

### Sale
```typescript
{
  id: number;
  date: Date;
  total: number;
  status: string; // 'active', 'completed', 'refunded', 'partially_refunded'
  storeId: number;
  userId: number;
  lines: SaleLineDTO[];
}
```

### Refund
```typescript
{
  id: number;
  date: Date;
  total: number;
  reason: string;
  storeId: number;
  userId: number;
  saleId: number;
  lines: RefundLineDTO[];
}
```

### Sale/Refund Line
```typescript
{
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

## Business Rules

1. **Sale Validation**: Sales must have valid line items with positive quantities and prices
2. **Refund Authorization**: Only active/completed sales can be refunded
3. **Refund Limits**: Cannot refund more than the original sale amount
4. **Status Management**: Automatic status updates based on refund activity
5. **Line Item Integrity**: All line items must reference valid products

## Request Examples

### Create Sale
```json
{
  "userId": 1,
  "storeId": 1,
  "lines": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 29.99
    },
    {
      "productId": 2,
      "quantity": 1,
      "unitPrice": 15.50
    }
  ]
}
```

### Create Refund
```json
{
  "userId": 1,
  "storeId": 1,
  "saleId": 123,
  "reason": "Defective product",
  "lines": [
    {
      "productId": 1,
      "quantity": 1,
      "unitPrice": 29.99
    }
  ]
}
```

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
- **Cross-Domain Queries**: Controlled access to other domains for validation
- **Connection Optimization**: Single shared connection pool across all services

### Domain Boundaries
The Transaction Service has access to:
- **Direct Access**: Sale, SaleLine, Refund, RefundLine entities
- **Cross-Domain Access**: Read-only validation access to User, Product, Store entities via `ICrossDomainQueries`

### Repository Interfaces

```typescript
interface ISaleRepository extends IBaseRepository<Sale, number> {
  findByUserId(userId: number): Promise<Sale[]>;
  findByStoreId(storeId: number): Promise<Sale[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
}

interface IRefundRepository extends IBaseRepository<Refund, number> {
  findBySaleId(saleId: number): Promise<Refund[]>;
  findByUserId(userId: number): Promise<Refund[]>;
  findByStoreId(storeId: number): Promise<Refund[]>;
}
```

### Cross-Domain Validation

```typescript
interface ICrossDomainQueries {
  validateUserExists(userId: number): Promise<boolean>;
  validateProductExists(productId: number): Promise<boolean>;
  validateStoreExists(storeId: number): Promise<boolean>;
  getProductDetails(productId: number): Promise<ProductDetails | null>;
  getUserDetails(userId: number): Promise<UserDetails | null>;
}
```

### Database Schema

The service uses the following Prisma models:

- `Sale`: Main sales transaction record
- `SaleLine`: Individual line items in a sale
- `Refund`: Refund transaction record
- `RefundLine`: Individual line items in a refund
- `User`: Customer/user information (cross-domain validation only)
- `Store`: Store information (cross-domain validation only)
- `Product`: Product information (cross-domain validation only)

## Integration

This service integrates with:
- **API Gateway**: Routes traffic through Kong Gateway
- **Catalog Service**: References products and stores for validation
- **User Service**: Validates customer information
- **Stock Service**: May trigger stock adjustments (future enhancement)

## Error Handling

The service provides structured error responses:
- `400 Bad Request`: Invalid input data or business rule violations
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server errors

## Business Logic

### Sale Processing
1. Validate user and store exist
2. Calculate total from line items
3. Create sale with 'active' status
4. Generate sale response with calculated totals

### Refund Processing
1. Validate original sale exists and is refundable
2. Check refund amounts don't exceed original sale
3. Update original sale status (refunded/partially_refunded)
4. Create refund record with line items

## Best Practices for Domain Boundaries

### Allowed Data Access
- ✅ Direct access to Sale, SaleLine, Refund, RefundLine entities via respective repositories
- ✅ Transaction-specific operations (sales processing, refund management)
- ✅ Cross-domain validation via `ICrossDomainQueries` interface
- ❌ Direct access to User, Product, Store repositories (use cross-domain queries instead)

### Repository Usage
```typescript
// ✅ Correct - Using domain repositories
const sale = await saleRepository.findById(saleId);
const userRefunds = await refundRepository.findByUserId(userId);

// ✅ Correct - Cross-domain validation
const isValidUser = await crossDomainQueries.validateUserExists(userId);
const productDetails = await crossDomainQueries.getProductDetails(productId);

// ❌ Incorrect - Direct access to other domains
const user = await userRepository.findById(userId); // Use crossDomainQueries instead
const product = await productRepository.findById(productId); // Use crossDomainQueries instead
```

### Cross-Domain Operations
```typescript
// Example: Creating a sale with validation
async createSale(saleData: CreateSaleDto): Promise<Sale> {
  // Validate cross-domain entities
  const userExists = await this.crossDomainQueries.validateUserExists(saleData.userId);
  if (!userExists) {
    throw new Error('User not found');
  }

  const storeExists = await this.crossDomainQueries.validateStoreExists(saleData.storeId);
  if (!storeExists) {
    throw new Error('Store not found');
  }

  // Process sale within transaction domain
  return this.saleRepository.save(saleData);
}
```

### Development Guidelines
1. **Transaction Domain Focus**: Only implement sales and refund-related business logic
2. **Repository Interfaces**: Always use domain-specific repository interfaces
3. **Cross-Domain Validation**: Use `ICrossDomainQueries` for validation, never direct repository access
4. **Transaction Management**: Use proper transaction boundaries for multi-step operations
5. **Business Rules**: Enforce refund policies and transaction integrity
6. **Testing**: Mock both domain repositories and cross-domain queries for unit tests

## Monitoring

Health check endpoint: `GET /health`

Returns:
```json
{
  "status": "healthy",
  "service": "transaction-service"
}
```
