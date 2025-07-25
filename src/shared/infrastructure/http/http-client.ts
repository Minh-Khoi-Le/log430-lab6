// HTTP Client for inter-service communication
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../../application/interfaces/base-interfaces';

export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string, timeout: number = 5000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making request to: ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('HTTP Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Service Registry for service discovery
export class ServiceRegistry {
  private services: Map<string, string> = new Map();

  register(serviceName: string, serviceUrl: string): void {
    this.services.set(serviceName, serviceUrl);
  }

  getServiceUrl(serviceName: string): string | undefined {
    return this.services.get(serviceName);
  }

  getHttpClient(serviceName: string): HttpClient | null {
    const serviceUrl = this.getServiceUrl(serviceName);
    if (!serviceUrl) {
      console.error(`Service ${serviceName} not found in registry`);
      return null;
    }
    return new HttpClient(serviceUrl);
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
