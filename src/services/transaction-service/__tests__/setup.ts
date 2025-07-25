// Test setup for Transaction Service
import { jest } from '@jest/globals';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    sale: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    saleLine: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    refundLine: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

// Mock axios for external API calls
jest.mock('axios');

// Setup test environment
process.env.NODE_ENV = 'test';
