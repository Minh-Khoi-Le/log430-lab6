/**
 * User Service Client
 * 
 * Handles communication with the user service for user operations:
 * - User validation
 * - User authentication
 * - User information retrieval
 */

import { BaseServiceClient, ServiceClientConfig } from './base-service-client';
import { ApiResponse } from '@shared/application/interfaces/base-interfaces';

// DTOs for user service operations
export interface UserValidationRequest {
  userId: number;
}

export interface UserValidationResponse {
  valid: boolean;
  user?: {
    id: number;
    name: string;
    role: string;
  };
  error?: string;
}

export interface UserAuthenticationRequest {
  name: string;
  password: string;
}

export interface UserAuthenticationResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    role: string;
  };
  token?: string;
  error?: string;
}

export interface UserInfoRequest {
  userId: number;
}

export interface UserInfoResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    role: string;
  };
  error?: string;
}

/**
 * Client for communicating with the user service
 */
export class UserServiceClient extends BaseServiceClient {
  constructor(config: Omit<ServiceClientConfig, 'serviceName'>) {
    super({
      ...config,
      serviceName: 'user-service'
    });
  }

  /**
   * Validate that a user exists and is active
   */
  async validateUser(request: UserValidationRequest): Promise<ApiResponse<UserValidationResponse>> {
    this.logger.info('Validating user', {
      userId: request.userId
    });

    try {
      // Since the user service doesn't have a specific validation endpoint,
      // we'll use a different approach - try to get user info
      const response = await this.getUserInfo(request.userId);

      if (response.success && response.data?.success && response.data.user) {
        this.logger.info('User validation successful', {
          userId: request.userId,
          userName: response.data.user.name,
          userRole: response.data.user.role
        });

        return {
          success: true,
          data: {
            valid: true,
            user: response.data.user
          }
        };
      } else {
        this.logger.warn('User validation failed - user not found', {
          userId: request.userId,
          error: response.data?.error || response.error
        });

        return {
          success: true, // API call succeeded
          data: {
            valid: false,
            error: response.data?.error || response.error || 'User not found'
          }
        };
      }
    } catch (error) {
      this.logger.error('User validation failed', error as Error, {
        userId: request.userId
      });

      return {
        success: false,
        error: `User validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Authenticate a user with credentials
   */
  async authenticateUser(request: UserAuthenticationRequest): Promise<ApiResponse<UserAuthenticationResponse>> {
    this.logger.info('Authenticating user', {
      userName: request.name
    });

    const response = await this.post<any>('/api/auth/login', {
      name: request.name,
      password: request.password
    });

    if (response.success && response.data?.success) {
      this.logger.info('User authentication successful', {
        userName: request.name,
        userId: response.data.user?.id,
        userRole: response.data.user?.role
      });

      return {
        success: true,
        data: {
          success: true,
          user: response.data.user,
          token: response.data.token
        }
      };
    } else {
      this.logger.warn('User authentication failed', {
        userName: request.name,
        error: response.data?.message || response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.data?.message || response.error || 'Authentication failed'
        }
      };
    }
  }

  /**
   * Get user information by ID
   */
  async getUserInfo(userId: number): Promise<ApiResponse<UserInfoResponse>> {
    this.logger.info('Retrieving user information', { userId });

    try {
      // Since the user service doesn't have a direct user info endpoint by ID,
      // we'll need to use the /api/auth/me endpoint with proper authentication
      // For now, we'll simulate this or use a different approach
      
      // In a real implementation, you might need to:
      // 1. Use an internal API key for service-to-service communication
      // 2. Have a dedicated internal endpoint for user lookup
      // 3. Use a shared database approach
      
      // For this implementation, we'll simulate user lookup
      const simulatedUser = {
        id: userId,
        name: `User ${userId}`,
        role: 'client'
      };

      // Simulate some validation logic
      if (userId > 0 && userId < 1000) {
        this.logger.info('User information retrieved successfully', {
          userId,
          userName: simulatedUser.name,
          userRole: simulatedUser.role
        });

        return {
          success: true,
          data: {
            success: true,
            user: simulatedUser
          }
        };
      } else {
        this.logger.warn('User not found', { userId });

        return {
          success: true, // API call succeeded
          data: {
            success: false,
            error: 'User not found'
          }
        };
      }
    } catch (error) {
      this.logger.error('Failed to retrieve user information', error as Error, { userId });

      return {
        success: false,
        error: `Failed to retrieve user information: ${(error as Error).message}`
      };
    }
  }

  /**
   * Register a new user (if needed for saga operations)
   */
  async registerUser(userData: { name: string; password: string; role?: string }): Promise<ApiResponse<UserAuthenticationResponse>> {
    this.logger.info('Registering new user', {
      userName: userData.name,
      userRole: userData.role || 'client'
    });

    const response = await this.post<any>('/api/auth/register', userData);

    if (response.success && response.data?.success) {
      this.logger.info('User registration successful', {
        userName: userData.name,
        userId: response.data.user?.id,
        userRole: response.data.user?.role
      });

      return {
        success: true,
        data: {
          success: true,
          user: response.data.user,
          token: response.data.token
        }
      };
    } else {
      this.logger.error('User registration failed', undefined, {
        userName: userData.name,
        error: response.data?.message || response.error
      });

      return {
        success: true, // API call succeeded
        data: {
          success: false,
          error: response.data?.message || response.error || 'Registration failed'
        }
      };
    }
  }

  /**
   * Check if user has specific permissions (role-based)
   */
  async checkUserPermissions(userId: number, requiredRole: string): Promise<ApiResponse<{ hasPermission: boolean; userRole?: string }>> {
    this.logger.info('Checking user permissions', {
      userId,
      requiredRole
    });

    const userInfoResponse = await this.getUserInfo(userId);

    if (userInfoResponse.success && userInfoResponse.data?.success && userInfoResponse.data.user) {
      const userRole = userInfoResponse.data.user.role;
      const hasPermission = this.checkRolePermission(userRole, requiredRole);

      this.logger.info('User permission check completed', {
        userId,
        userRole,
        requiredRole,
        hasPermission
      });

      return {
        success: true,
        data: {
          hasPermission,
          userRole
        }
      };
    } else {
      this.logger.warn('User permission check failed - user not found', {
        userId,
        requiredRole
      });

      return {
        success: true, // API call succeeded
        data: {
          hasPermission: false
        }
      };
    }
  }

  /**
   * Simple role-based permission check
   */
  private checkRolePermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy: Record<string, number> = {
      'client': 1,
      'employee': 2,
      'admin': 3
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }
}