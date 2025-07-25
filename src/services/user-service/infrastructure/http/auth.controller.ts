import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { CacheService } from '@shared/infrastructure/caching';
import { createLogger } from '@shared/infrastructure/logging';
import { IUserRepository } from '../../domain/repositories/user.repository';

// Create a logger for the AuthController
const logger = createLogger('auth-controller');

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

/**
 * HTTP controller for authentication-related operations.
 * Handles user login, logout, and authentication validation.
 */
export class AuthController {
  private readonly cacheService: CacheService | undefined;
  
  /**
   * @param userRepository User repository for authentication operations
   * @param cacheService Optional cache service for performance optimization
   */
  constructor(
    private readonly userRepository: IUserRepository,
    cacheService?: CacheService
  ) {
    this.cacheService = cacheService;
  }

  /**
   * Handles user login and JWT token generation.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { name, password } = req.body;

      // Validate user credentials using the shared repository
      const user = await this.userRepository.validateUserCredentials(name, password);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name, 
          role: user.role 
        },
        process.env['JWT_SECRET'] ?? 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Return user data and token (excluding password)
      const userWithoutPassword = {
        id: user.id,
        name: user.name,
        role: user.role
      };
      
      res.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: token
      });
    } catch (error) {
      logger.error('Login error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Handles user registration and JWT token generation.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, password, role = 'client' } = req.body;

      // Create user using the shared repository
      const user = await this.userRepository.save({
        name,
        password,
        role
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name, 
          role: user.role 
        },
        process.env['JWT_SECRET'] ?? 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Return user data and token (excluding password)
      const userWithoutPassword = {
        id: user.id,
        name: user.name,
        role: user.role
      };
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: userWithoutPassword,
        token: token
      });
    } catch (error) {
      logger.error('Registration error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Retrieves the current authenticated user's information.
   * @param req HTTP request object with user authentication data
   * @param res HTTP response object
   */
  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Return user data without password
      const userWithoutPassword = {
        id: user.id,
        name: user.name,
        role: user.role
      };

      res.json({
        success: true,
        data: { user: userWithoutPassword }
      });
    } catch (error) {
      logger.error('Get user info error', error as Error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
