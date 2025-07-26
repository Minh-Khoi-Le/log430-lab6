/**
 * Service Client Factory
 * 
 * Factory for creating and configuring service clients with environment-based configuration
 */

import { CatalogServiceClient } from './catalog-service.client';
import { TransactionServiceClient } from './transaction-service.client';
import { UserServiceClient } from './user-service.client';
import { ServiceClientConfig } from './base-service-client';

export interface ServiceClientFactoryConfig {
  catalogServiceUrl: string;
  transactionServiceUrl: string;
  userServiceUrl: string;
  internalApiKey: string;
  timeout?: number;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  retryMultiplier?: number;
}

/**
 * Factory class for creating service clients
 */
export class ServiceClientFactory {
  private readonly config: ServiceClientFactoryConfig;

  constructor(config: ServiceClientFactoryConfig) {
    this.config = config;
  }

  /**
   * Create a catalog service client
   */
  createCatalogServiceClient(): CatalogServiceClient {
    const clientConfig: Omit<ServiceClientConfig, 'serviceName'> = {
      baseURL: this.config.catalogServiceUrl,
      timeout: this.config.timeout || 5000,
      maxRetries: this.config.maxRetries || 3,
      initialRetryDelay: this.config.initialRetryDelay || 1000,
      maxRetryDelay: this.config.maxRetryDelay || 10000,
      retryMultiplier: this.config.retryMultiplier || 2,
      apiKey: this.config.internalApiKey
    };

    return new CatalogServiceClient(clientConfig);
  }

  /**
   * Create a transaction service client
   */
  createTransactionServiceClient(): TransactionServiceClient {
    const clientConfig: Omit<ServiceClientConfig, 'serviceName'> = {
      baseURL: this.config.transactionServiceUrl,
      timeout: this.config.timeout || 5000,
      maxRetries: this.config.maxRetries || 3,
      initialRetryDelay: this.config.initialRetryDelay || 1000,
      maxRetryDelay: this.config.maxRetryDelay || 10000,
      retryMultiplier: this.config.retryMultiplier || 2,
      apiKey: this.config.internalApiKey
    };

    return new TransactionServiceClient(clientConfig);
  }

  /**
   * Create a user service client
   */
  createUserServiceClient(): UserServiceClient {
    const clientConfig: Omit<ServiceClientConfig, 'serviceName'> = {
      baseURL: this.config.userServiceUrl,
      timeout: this.config.timeout || 5000,
      maxRetries: this.config.maxRetries || 3,
      initialRetryDelay: this.config.initialRetryDelay || 1000,
      maxRetryDelay: this.config.maxRetryDelay || 10000,
      retryMultiplier: this.config.retryMultiplier || 2,
      apiKey: this.config.internalApiKey
    };

    return new UserServiceClient(clientConfig);
  }

  /**
   * Create all service clients
   */
  createAllClients(): {
    catalogService: CatalogServiceClient;
    transactionService: TransactionServiceClient;
    userService: UserServiceClient;
  } {
    return {
      catalogService: this.createCatalogServiceClient(),
      transactionService: this.createTransactionServiceClient(),
      userService: this.createUserServiceClient()
    };
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks(): Promise<{
    catalogService: boolean;
    transactionService: boolean;
    userService: boolean;
    allHealthy: boolean;
  }> {
    const clients = this.createAllClients();

    const [catalogHealth, transactionHealth, userHealth] = await Promise.all([
      clients.catalogService.healthCheck(),
      clients.transactionService.healthCheck(),
      clients.userService.healthCheck()
    ]);

    const results = {
      catalogService: catalogHealth.healthy,
      transactionService: transactionHealth.healthy,
      userService: userHealth.healthy,
      allHealthy: catalogHealth.healthy && transactionHealth.healthy && userHealth.healthy
    };

    return results;
  }
}

/**
 * Create service client factory from environment variables
 */
export function createServiceClientFactoryFromEnv(): ServiceClientFactory {
  const config: ServiceClientFactoryConfig = {
    catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://catalog-service:3000',
    transactionServiceUrl: process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3000',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:3000',
    internalApiKey: process.env.INTERNAL_API_KEY || 'saga-internal-key-12345',
    timeout: process.env.SERVICE_CLIENT_TIMEOUT ? parseInt(process.env.SERVICE_CLIENT_TIMEOUT) : 5000,
    maxRetries: process.env.SERVICE_CLIENT_MAX_RETRIES ? parseInt(process.env.SERVICE_CLIENT_MAX_RETRIES) : 3,
    initialRetryDelay: process.env.SERVICE_CLIENT_INITIAL_RETRY_DELAY ? parseInt(process.env.SERVICE_CLIENT_INITIAL_RETRY_DELAY) : 1000,
    maxRetryDelay: process.env.SERVICE_CLIENT_MAX_RETRY_DELAY ? parseInt(process.env.SERVICE_CLIENT_MAX_RETRY_DELAY) : 10000,
    retryMultiplier: process.env.SERVICE_CLIENT_RETRY_MULTIPLIER ? parseFloat(process.env.SERVICE_CLIENT_RETRY_MULTIPLIER) : 2
  };

  return new ServiceClientFactory(config);
}