/**
 * Jest setup file for saga-orchestrator-service tests
 * This file is run before each test file
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.SERVICE_NAME = 'saga-orchestrator-service';
process.env.USER_SERVICE_URL = 'http://localhost:3001';
process.env.CATALOG_SERVICE_URL = 'http://localhost:3002';
process.env.TRANSACTION_SERVICE_URL = 'http://localhost:3003';
process.env.INTERNAL_API_KEY = 'test-api-key';

// Global test timeout
jest.setTimeout(10000);