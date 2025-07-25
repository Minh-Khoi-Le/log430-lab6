# Shared Logging Service

A centralized logging utility that provides consistent logging capabilities across all microservices.

## Features

- Standardized log format across all services
- Support for multiple log levels (INFO, WARN, ERROR)
- Context-rich logging with timestamps, service names, and additional metadata
- Flexible configuration options
- Error object handling with stack traces

## Usage

### Basic Usage

```typescript
import { createLogger } from '@shared/infrastructure/logging';

// Create a logger for your service
const logger = createLogger('your-service-name');

// Log messages at different levels
logger.info('Service started successfully');
logger.warn('Resource usage is high');
logger.error('Operation failed', new Error('Database connection error'));
```

### With Context

```typescript
// Log with additional context
logger.info('User authenticated', { 
  userId: 123, 
  role: 'admin'
});

// Log errors with context
try {
  // Some operation that might fail
} catch (error) {
  logger.error('Failed to process payment', error as Error, {
    transactionId: 'tx_123456',
    amount: 99.99
  });
}
```

### Configuration Options

```typescript
import { createLogger, LogLevel } from '@shared/infrastructure/logging';

// Create a logger with custom options
const logger = createLogger('payment-service', {
  minLevel: LogLevel.WARN,     // Only log warnings and errors
  enableConsole: true,         // Output to console (default: true)
});
```

## Log Levels

- **INFO**: General operational information
- **WARN**: Warning conditions that might lead to errors
- **ERROR**: Error conditions that affect operation but don't stop the service

## Log Format

Logs are formatted as:

```text
[TIMESTAMP] [SERVICE_NAME] [LEVEL] Message
{ Context object if provided }
```

Example:

```text
[2025-07-02T15:30:45.123Z] [user-service] [INFO] User authenticated
{ userId: 123, role: 'admin' }
```

## Integration with Services

In a typical service, you would create one logger instance per module:

```typescript
// user.controller.ts
import { createLogger } from '@shared/infrastructure/logging';

const logger = createLogger('user-service');

export class UserController {
  login(req, res) {
    logger.info('Login attempt', { username: req.body.username });
    // ...
  }
}
```

## Future Enhancements

- File-based logging
- Integration with external logging services
- Structured logging formats (JSON)
- Log rotation and management
- Additional log levels (DEBUG, TRACE)
- Request ID tracking across services
