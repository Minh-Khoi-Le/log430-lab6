import { Request, Response, Router } from 'express';
import { UserService } from '../../domain/services/user.service';
import { UserDTO } from '../../application/dtos/user.dto';
import { createLogger } from '@shared/infrastructure/logging';
import { CacheService, createCacheMiddleware } from '@shared/infrastructure/caching';
import { IUserRepository } from '../../domain/repositories/user.repository';

// Create a logger for the UserController
const logger = createLogger('user-controller');

/**
 * HTTP controller for User-related operations.
 * Handles HTTP requests and responses for user management with caching support.
 */
export class UserController {
  private readonly userService: UserService;
  private readonly cacheService: CacheService | undefined;
  public router: Router;

  /**
   * @param cacheService Optional cache service for performance optimization
   * @param userRepository User repository instance for data operations
   */
  constructor(cacheService?: CacheService, userRepository?: IUserRepository) {
    if (!userRepository) {
      throw new Error('UserRepository is required');
    }
    this.userService = new UserService(userRepository);
    this.cacheService = cacheService;
    this.router = Router();
    this.setupRoutes();
    logger.info('UserController initialized');
  }

  /**
   * Sets up HTTP routes with optional caching middleware.
   */
  private setupRoutes(): void {
    // Apply cache middleware to GET routes
    if (this.cacheService) {
      const userCache = createCacheMiddleware({ 
        cacheService: this.cacheService, 
        ttl: 600 // 10 minutes
      });
      
      this.router.post('/', this.createUser.bind(this));
      this.router.get('/:id', userCache, this.getUser.bind(this));
      this.router.put('/:id', this.updateUser.bind(this));
      this.router.delete('/:id', this.deleteUser.bind(this));
      this.router.get('/', userCache, this.getAllUsers.bind(this));
    } else {
      this.router.post('/', this.createUser.bind(this));
      this.router.get('/:id', this.getUser.bind(this));
      this.router.put('/:id', this.updateUser.bind(this));
      this.router.delete('/:id', this.deleteUser.bind(this));
      this.router.get('/', this.getAllUsers.bind(this));
    }
  }

  /**
   * Retrieves all users.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  public async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all users');
      const users = await this.userService.getAllUsers();
      logger.info(`Retrieved ${users.length} users`);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      logger.error('Failed to fetch all users', error as Error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Creates a new user.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userDto: UserDTO = req.body;
      logger.info('Creating new user', { name: userDto.name, role: userDto.role });
      
      const user = await this.userService.createUser(userDto);
      
      // Invalidate users list cache
      if (this.cacheService) {
        this.cacheService.delete('GET:/api/users');
        logger.info('Cache invalidated after user creation');
      }
      
      logger.info('User created successfully', { userId: user.id, name: user.name });
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      logger.error('Failed to create user', error as Error, {
        userData: req.body
      });
      
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Retrieves a user by ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      const user = await this.userService.getUserById(userId);
      if (user) {
        res.status(200).json({ success: true, data: user });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Updates an existing user.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      const userDto: UserDTO = req.body;
      const updatedUser = await this.userService.updateUser(userId, userDto);
      
      // Invalidate user cache after update
      if (this.cacheService) {
        this.cacheService.delete(`GET:/api/users/${userId}`);
        this.cacheService.delete('GET:/api/users');
        this.cacheService.delete('GET:/api/users/me');
        logger.info('Cache invalidated after user update', { userId });
      }
      
      if (updatedUser) {
        res.status(200).json({ success: true, data: updatedUser });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Deletes a user by ID.
   * @param req HTTP request object
   * @param res HTTP response object
   */
  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      await this.userService.deleteUser(userId);
      
      // Invalidate user cache after deletion
      if (this.cacheService) {
        this.cacheService.delete(`GET:/api/users/${userId}`);
        this.cacheService.delete('GET:/api/users');
        logger.info('Cache invalidated after user deletion', { userId });
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}