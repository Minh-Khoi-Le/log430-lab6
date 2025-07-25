module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    'node_modules/',
    'dist/',
    '.*\\.integration\\.test\\.ts$'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!node_modules/**',
    '!dist/**'
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
  },
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
