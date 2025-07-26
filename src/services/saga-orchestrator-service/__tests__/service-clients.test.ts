/**
 * Unit tests for service clients
 */

import { CatalogServiceClient, TransactionServiceClient, UserServiceClient } from '../infrastructure/services';
import { ServiceClientFactory } from '../infrastructure/services/service-client.factory';
import axios from 'axios';

// Mock axios to avoid actual HTTP calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return a mock instance
mockedAxios.create = jest.fn((config: any) => ({
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  },
  defaults: {
    baseURL: config?.baseURL || 'http://test:3000'
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
} as any));

describe('Service Clients', () => {
  const mockConfig = {
    catalogServiceUrl: 'http://catalog-service:3000',
    transactionServiceUrl: 'http://transaction-service:3000',
    userServiceUrl: 'http://user-service:3000',
    internalApiKey: 'test-api-key',
    timeout: 5000,
    maxRetries: 3
  };

  describe('ServiceClientFactory', () => {
    let factory: ServiceClientFactory;

    beforeEach(() => {
      factory = new ServiceClientFactory(mockConfig);
    });

    it('should create catalog service client', () => {
      const client = factory.createCatalogServiceClient();
      expect(client).toBeInstanceOf(CatalogServiceClient);
      expect(client.getServiceName()).toBe('catalog-service');
      expect(client.getBaseURL()).toBe(mockConfig.catalogServiceUrl);
    });

    it('should create transaction service client', () => {
      const client = factory.createTransactionServiceClient();
      expect(client).toBeInstanceOf(TransactionServiceClient);
      expect(client.getServiceName()).toBe('transaction-service');
      expect(client.getBaseURL()).toBe(mockConfig.transactionServiceUrl);
    });

    it('should create user service client', () => {
      const client = factory.createUserServiceClient();
      expect(client).toBeInstanceOf(UserServiceClient);
      expect(client.getServiceName()).toBe('user-service');
      expect(client.getBaseURL()).toBe(mockConfig.userServiceUrl);
    });

    it('should create all clients', () => {
      const clients = factory.createAllClients();
      expect(clients.catalogService).toBeInstanceOf(CatalogServiceClient);
      expect(clients.transactionService).toBeInstanceOf(TransactionServiceClient);
      expect(clients.userService).toBeInstanceOf(UserServiceClient);
    });
  });

  describe('CatalogServiceClient', () => {
    let client: CatalogServiceClient;

    beforeEach(() => {
      client = new CatalogServiceClient({
        baseURL: mockConfig.catalogServiceUrl,
        apiKey: mockConfig.internalApiKey,
        timeout: mockConfig.timeout,
        maxRetries: mockConfig.maxRetries
      });
    });

    it('should be created with correct configuration', () => {
      expect(client.getServiceName()).toBe('catalog-service');
      expect(client.getBaseURL()).toBe(mockConfig.catalogServiceUrl);
    });

    it('should have health check method', async () => {
      // Mock the health check to avoid actual HTTP call
      const healthCheckSpy = jest.spyOn(client, 'healthCheck').mockResolvedValue({
        healthy: true,
        responseTime: 100
      });

      const result = await client.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBe(100);
      
      healthCheckSpy.mockRestore();
    });
  });

  describe('TransactionServiceClient', () => {
    let client: TransactionServiceClient;

    beforeEach(() => {
      client = new TransactionServiceClient({
        baseURL: mockConfig.transactionServiceUrl,
        apiKey: mockConfig.internalApiKey,
        timeout: mockConfig.timeout,
        maxRetries: mockConfig.maxRetries
      });
    });

    it('should be created with correct configuration', () => {
      expect(client.getServiceName()).toBe('transaction-service');
      expect(client.getBaseURL()).toBe(mockConfig.transactionServiceUrl);
    });

    it('should have health check method', async () => {
      // Mock the health check to avoid actual HTTP call
      const healthCheckSpy = jest.spyOn(client, 'healthCheck').mockResolvedValue({
        healthy: true,
        responseTime: 150
      });

      const result = await client.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBe(150);
      
      healthCheckSpy.mockRestore();
    });
  });

  describe('UserServiceClient', () => {
    let client: UserServiceClient;

    beforeEach(() => {
      client = new UserServiceClient({
        baseURL: mockConfig.userServiceUrl,
        apiKey: mockConfig.internalApiKey,
        timeout: mockConfig.timeout,
        maxRetries: mockConfig.maxRetries
      });
    });

    it('should be created with correct configuration', () => {
      expect(client.getServiceName()).toBe('user-service');
      expect(client.getBaseURL()).toBe(mockConfig.userServiceUrl);
    });

    it('should have health check method', async () => {
      // Mock the health check to avoid actual HTTP call
      const healthCheckSpy = jest.spyOn(client, 'healthCheck').mockResolvedValue({
        healthy: true,
        responseTime: 120
      });

      const result = await client.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBe(120);
      
      healthCheckSpy.mockRestore();
    });
  });
});