module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/integration/'
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
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts'
  ]
};