# User Service

The User Service is a microservice responsible for handling user authentication and user management in the system.

## Features

- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- User profile management
- Protected routes with middleware

## API Endpoints

### Authentication Endpoints

- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `GET /api/users/me` - Get current user profile (authenticated)

### User Management Endpoints

- `GET /api/users` - Get all users (authenticated)
- `GET /api/users/:id` - Get user by ID (authenticated)
- `POST /api/users` - Create a new user (authenticated)
- `PUT /api/users/:id` - Update user (authenticated)
- `DELETE /api/users/:id` - Delete user (authenticated)

## Authentication

The service uses JWT tokens for authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <token>
```

## Request/Response Format

### Login Request

```json
{
  "name": "username",
  "password": "password"
}
```

### Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "username",
    "role": "client"
  },
  "token": "jwt-token-here"
}
```

### Register Request

```json
{
  "name": "username",
  "password": "password",
  "role": "client" // optional, defaults to "client"
}
```

## User Roles

- `admin` - Full access to all endpoints
- `client` - Limited access to user-specific endpoints

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Database Architecture

The service uses a **centralized database infrastructure** with domain-specific repository patterns:

### Shared Infrastructure

- **Database Manager**: Centralized Prisma client management from `src/shared/infrastructure/database/`
- **Repository Pattern**: Domain-specific interfaces with shared implementations
- **Connection Optimization**: Single shared connection pool across all services

### Domain Boundaries

The User Service has access to:

- **Direct Access**: User entities only
- **Cross-Domain Access**: None required (maintains strict domain boundaries)

### Repository Interface

```typescript
interface IUserRepository extends IBaseRepository<User, number> {
  findByName(name: string): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
}
```

### Database Schema

```prisma
model User {
  id       Int    @id @default(autoincrement())
  name     String @unique
  password String
  role     String @default("client")
  sales    Sale[]
  refunds  Refund[]
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker

The service includes a Dockerfile for containerization:

```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 3000:3000 user-service
```

## Security

- Passwords are hashed using bcrypt with salt rounds
- JWT tokens expire after 24 hours
- CORS is configured for cross-origin requests
- Input validation and error handling
- Environment-based configuration

## Testing

Run the test suite:

```bash
npm test
```

## Architecture

The service follows Clean Architecture principles:

- **Domain**: Entities and repository interfaces
- **Application**: Use cases and DTOs
- **Infrastructure**: Controllers, database implementations, and middleware

## Dependencies

- Express.js - Web framework
- Shared Database Infrastructure - Centralized database management
- bcryptjs - Password hashing
- jsonwebtoken - JWT token handling
- cors - CORS middleware
- TypeScript - Type safety
