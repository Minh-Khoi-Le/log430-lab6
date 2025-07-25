// Test setup for Catalog Service - Unit Tests
import { jest } from '@jest/globals';

// Mock Prisma Client for unit tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    stock: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  })),
}));

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.SERVICE_NAME = 'catalog-service';
process.env.LOG_LEVEL = 'error';
process.env.LOW_STOCK_THRESHOLD = '10';