import { BaseRepository } from '@shared/infrastructure/database/base-repository';
import { IDatabaseManager } from '@shared/infrastructure/database/database-manager';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { createLogger } from '@shared/infrastructure/logging';
import * as bcrypt from 'bcryptjs';

const logger = createLogger('shared-user-repository');

/**
 * Shared repository implementation for User entities.
 * Provides database persistence operations for users using a shared database.
 */
export class SharedUserRepository extends BaseRepository<User, number> implements IUserRepository {
  /**
   * @param databaseManager Database manager instance for database operations
   */
  constructor(databaseManager: IDatabaseManager) {
    super(databaseManager, 'user');
  }

  /**
   * Creates a new user with password hashing and validation.
   * Override save to handle User entity creation properly.
   * @param userData User data without ID
   * @returns Promise resolving to the created User entity
   */
  public async save(userData: Omit<User, 'id'>): Promise<User> {
    try {
      logger.info('Creating new user', { name: userData.name, role: userData.role });
      
      // Validate required fields
      if (!userData.name || !userData.password) {
        throw new Error('Name and password are required');
      }

      // Check if name is already taken
      const nameExists = await this.isNameTaken(userData.name);
      if (nameExists) {
        throw new Error(`User with name '${userData.name}' already exists`);
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const result = await this.model.create({
        data: {
          name: userData.name,
          role: userData.role || 'client',
          password: hashedPassword,
        },
      });

      logger.info('Created new user', { id: result.id, name: result.name });
      
      return new User(result.id, result.name, result.role, result.password);
    } catch (error) {
      logger.error('Error creating user', error as Error, { name: userData.name });
      throw error;
    }
  }

  // User-specific query methods
  public async findByName(name: string): Promise<User | null> {
    try {
      logger.info('Finding user by name', { name });
      
      if (!name) {
        return null;
      }

      const user = await this.model.findUnique({
        where: { name },
      });

      if (!user) {
        logger.info('User not found by name', { name });
        return null;
      }

      logger.info('Found user by name', { id: user.id, name: user.name });
      return new User(user.id, user.name, user.role, user.password);
    } catch (error) {
      logger.error('Error finding user by name', error as Error, { name });
      throw error;
    }
  }

  public async findByRole(role: string): Promise<User[]> {
    try {
      logger.info('Finding users by role', { role });
      
      if (!role) {
        return [];
      }

      const users = await this.model.findMany({
        where: { role },
        orderBy: { name: 'asc' },
      });

      logger.info('Found users by role', { role, count: users.length });
      
      return users.map((user: any) => 
        new User(user.id, user.name, user.role, user.password)
      );
    } catch (error) {
      logger.error('Error finding users by role', error as Error, { role });
      throw error;
    }
  }

  // Domain-specific validation methods
  public async validateUserCredentials(name: string, password: string): Promise<User | null> {
    try {
      logger.info('Validating user credentials', { name });
      
      if (!name || !password) {
        logger.info('Invalid credentials provided - missing name or password');
        return null;
      }

      const user = await this.findByName(name);
      if (!user) {
        logger.info('User not found for credential validation', { name });
        return null;
      }

      // Compare password with hashed password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.info('Invalid password for user', { name });
        return null;
      }

      logger.info('User credentials validated successfully', { id: user.id, name: user.name });
      return user;
    } catch (error) {
      logger.error('Error validating user credentials', error as Error, { name });
      throw error;
    }
  }

  public async isNameTaken(name: string, excludeId?: number): Promise<boolean> {
    try {
      logger.info('Checking if name is taken', { name, excludeId });
      
      if (!name) {
        return false;
      }

      const whereClause: any = { name };
      if (excludeId !== undefined) {
        whereClause.id = { not: excludeId };
      }

      const existingUser = await this.model.findFirst({
        where: whereClause,
        select: { id: true },
      });

      const isTaken = !!existingUser;
      logger.info('Name availability check result', { name, isTaken, excludeId });
      
      return isTaken;
    } catch (error) {
      logger.error('Error checking if name is taken', error as Error, { name, excludeId });
      throw error;
    }
  }

  // User management methods
  public async updatePassword(id: number, newPassword: string): Promise<void> {
    try {
      logger.info('Updating user password', { id });
      
      if (!newPassword) {
        throw new Error('New password is required');
      }

      // Check if user exists
      const userExists = await this.exists(id);
      if (!userExists) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.model.update({
        where: { id },
        data: { password: hashedPassword },
      });

      logger.info('User password updated successfully', { id });
    } catch (error) {
      logger.error('Error updating user password', error as Error, { id });
      throw error;
    }
  }

  public async updateRole(id: number, newRole: string): Promise<User> {
    try {
      logger.info('Updating user role', { id, newRole });
      
      if (!newRole) {
        throw new Error('New role is required');
      }

      // Validate role
      const validRoles = ['admin', 'client'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Invalid role: ${newRole}. Valid roles are: ${validRoles.join(', ')}`);
      }

      const updatedUser = await this.model.update({
        where: { id },
        data: { role: newRole },
      });

      logger.info('User role updated successfully', { id, newRole });
      
      return new User(updatedUser.id, updatedUser.name, updatedUser.role, updatedUser.password);
    } catch (error) {
      logger.error('Error updating user role', error as Error, { id, newRole });
      throw error;
    }
  }

  // User statistics for domain analytics
  public async countByRole(role: string): Promise<number> {
    try {
      logger.info('Counting users by role', { role });
      
      if (!role) {
        return 0;
      }

      const count = await this.model.count({
        where: { role },
      });

      logger.info('User count by role result', { role, count });
      return count;
    } catch (error) {
      logger.error('Error counting users by role', error as Error, { role });
      throw error;
    }
  }

  public async findActiveUsers(): Promise<User[]> {
    try {
      logger.info('Finding active users');
      
      // For now, we consider all users as active since we don't have an 'active' field
      // This could be extended to filter by last login date or other criteria
      const users = await this.model.findMany({
        orderBy: { name: 'asc' },
      });

      logger.info('Found active users', { count: users.length });
      
      return users.map((user: any) => 
        new User(user.id, user.name, user.role, user.password)
      );
    } catch (error) {
      logger.error('Error finding active users', error as Error);
      throw error;
    }
  }

  // Override findById to return User entity
  public async findById(id: number): Promise<User | null> {
    try {
      const user = await super.findById(id);
      if (!user) {
        return null;
      }
      
      return new User(user.id, user.name, user.role, user.password);
    } catch (error) {
      logger.error('Error finding user by ID', error as Error, { id });
      throw error;
    }
  }

  // Override findAll to return User entities
  public async findAll(): Promise<User[]> {
    try {
      const users = await super.findAll();
      return users.map((user: any) => 
        new User(user.id, user.name, user.role, user.password)
      );
    } catch (error) {
      logger.error('Error finding all users', error as Error);
      throw error;
    }
  }

  // Override update to handle User entity updates properly
  public async update(id: number, userData: Partial<User>): Promise<User> {
    try {
      logger.info('Updating user', { id, userData: { ...userData, password: userData.password ? '[REDACTED]' : undefined } });
      
      // Validate that user exists
      const userExists = await this.exists(id);
      if (!userExists) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Check if name is being updated and if it's already taken
      if (userData.name) {
        const nameExists = await this.isNameTaken(userData.name, id);
        if (nameExists) {
          throw new Error(`User with name '${userData.name}' already exists`);
        }
      }

      // Hash password if it's being updated
      const updateData: any = { ...userData };
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 10);
      }

      // Validate role if it's being updated
      if (userData.role) {
        const validRoles = ['admin', 'client'];
        if (!validRoles.includes(userData.role)) {
          throw new Error(`Invalid role: ${userData.role}. Valid roles are: ${validRoles.join(', ')}`);
        }
      }

      const updatedUser = await this.model.update({
        where: { id },
        data: updateData,
      });

      logger.info('User updated successfully', { id });
      
      return new User(updatedUser.id, updatedUser.name, updatedUser.role, updatedUser.password);
    } catch (error) {
      logger.error('Error updating user', error as Error, { id });
      throw error;
    }
  }

  // Legacy interface compatibility
  public async create(user: User): Promise<User> {
    return this.save({
      name: user.name,
      role: user.role,
      password: user.password,
    });
  }
}