/**
 * Base Service Client with retry logic and error handling
 * 
 * Provides a foundation for inter-service communication with:
 * - HTTP timeout handling
 * - Exponential backoff retry mechanism
 * - Comprehensive error handling and logging
 * - Health check capabilities
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { createLogger, Logger } from '@shared/infrastructure/logging';
import { ApiResponse } from '@shared/application/interfaces/base-interfaces';

export interface ServiceClientConfig {
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  retryMultiplier?: number;
  apiKey?: string;
  serviceName: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Base service client class with retry logic and error handling
 */
export abstract class BaseServiceClient {
  protected readonly client: AxiosInstance;
  protected readonly logger: Logger;
  protected readonly retryConfig: RetryConfig;
  protected readonly serviceName: string;

  constructor(config: ServiceClientConfig) {
    this.serviceName = config.serviceName;
    this.logger = createLogger(`saga-orchestrator-${config.serviceName}-client`);
    
    // Set up retry configuration
    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      initialDelay: config.initialRetryDelay || 1000,
      maxDelay: config.maxRetryDelay || 10000,
      multiplier: config.retryMultiplier || 2
    };

    // Create axios instance with configuration
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey })
      }
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.info(`Making request to ${this.serviceName}`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        this.logger.error(`Request interceptor error for ${this.serviceName}`, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.info(`Successful response from ${this.serviceName}`, {
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time']
        });
        return response;
      },
      (error) => {
        if (error.response) {
          this.logger.error(`HTTP error from ${this.serviceName}`, error, {
            status: error.response.status,
            statusText: error.response.statusText,
            url: error.config?.url,
            data: error.response.data
          });
        } else if (error.request) {
          this.logger.error(`Network error to ${this.serviceName}`, error, {
            url: error.config?.url,
            timeout: error.code === 'ECONNABORTED'
          });
        } else {
          this.logger.error(`Request setup error for ${this.serviceName}`, error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute HTTP request with retry logic
   */
  protected async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    let lastError: Error;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        this.logger.info(`Executing ${operation} (attempt ${attempt}/${this.retryConfig.maxRetries})`);
        const result = await requestFn();
        
        if (attempt > 1) {
          this.logger.info(`${operation} succeeded after ${attempt} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`${operation} failed on attempt ${attempt}`, {
          attempt,
          maxRetries: this.retryConfig.maxRetries,
          willRetry: attempt < this.retryConfig.maxRetries && this.isRetryableError(error as AxiosError),
          error: lastError.message
        });

        // Don't retry if this is the last attempt or error is not retryable
        if (attempt >= this.retryConfig.maxRetries || !this.isRetryableError(error as AxiosError)) {
          break;
        }

        // Wait before retrying with exponential backoff
        await this.delay(delay);
        delay = Math.min(delay * this.retryConfig.multiplier, this.retryConfig.maxDelay);
      }
    }

    this.logger.error(`${operation} failed after ${this.retryConfig.maxRetries} attempts`, lastError!);
    throw lastError!;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors (no response received)
    if (!error.response) {
      return error.code === 'ECONNRESET' || 
             error.code === 'ETIMEDOUT' || 
             error.code === 'ECONNREFUSED' ||
             error.code === 'ENOTFOUND';
    }

    // HTTP status codes that are retryable
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.response.status);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generic GET request with retry logic
   */
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.executeWithRetry(
        () => this.client.get<T>(url, config),
        `GET ${url}`
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error as AxiosError, `GET ${url}`);
    }
  }

  /**
   * Generic POST request with retry logic
   */
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.executeWithRetry(
        () => this.client.post<T>(url, data, config),
        `POST ${url}`
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error as AxiosError, `POST ${url}`);
    }
  }

  /**
   * Generic PUT request with retry logic
   */
  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.executeWithRetry(
        () => this.client.put<T>(url, data, config),
        `PUT ${url}`
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error as AxiosError, `PUT ${url}`);
    }
  }

  /**
   * Generic DELETE request with retry logic
   */
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.executeWithRetry(
        () => this.client.delete<T>(url, config),
        `DELETE ${url}`
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error as AxiosError, `DELETE ${url}`);
    }
  }

  /**
   * Health check for the service
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await this.client.get('/health', { timeout: 3000 });
      const responseTime = Date.now() - startTime;
      
      this.logger.info(`Health check passed for ${this.serviceName}`, {
        responseTime
      });
      
      return {
        healthy: true,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.warn(`Health check failed for ${this.serviceName}`, {
        responseTime,
        error: errorMessage
      });
      
      return {
        healthy: false,
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Handle and format errors consistently
   */
  private handleError<T>(error: AxiosError, operation: string): ApiResponse<T> {
    let errorMessage = `${operation} failed`;
    
    if (error.response) {
      // Server responded with error status
      errorMessage = `${operation} failed with status ${error.response.status}: ${error.response.statusText}`;
      if (error.response.data && typeof error.response.data === 'object') {
        const responseData = error.response.data as any;
        if (responseData.message) {
          errorMessage += ` - ${responseData.message}`;
        } else if (responseData.error) {
          errorMessage += ` - ${responseData.error}`;
        }
      }
    } else if (error.request) {
      // Network error
      if (error.code === 'ETIMEDOUT') {
        errorMessage = `${operation} timed out`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = `${operation} failed - connection refused`;
      } else {
        errorMessage = `${operation} failed - network error`;
      }
    } else {
      // Request setup error
      errorMessage = `${operation} failed - ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Get service name
   */
  public getServiceName(): string {
    return this.serviceName;
  }

  /**
   * Get base URL
   */
  public getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }
}