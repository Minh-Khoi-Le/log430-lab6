// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Mock console.log to avoid noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
