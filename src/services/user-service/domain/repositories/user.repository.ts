import { User } from '../entities/user.entity';
import { IBaseRepository } from '@shared/infrastructure/database/base-repository';

/**
 * Repository interface for User entity persistence operations.
 * Extends the generic base repository with user-specific methods.
 */
export interface IUserRepository extends IBaseRepository<User, number> {
  /**
   * Finds a user by their name.
   * @param name User name to search for
   * @returns Promise resolving to the User entity or null if not found
   */
  findByName(name: string): Promise<User | null>;
  
  /**
   * Finds all users with a specific role.
   * @param role Role to filter by
   * @returns Promise resolving to an array of User entities
   */
  findByRole(role: string): Promise<User[]>;
  
  /**
   * Validates user credentials for authentication.
   * @param name Username
   * @param password Password
   * @returns Promise resolving to the User entity or null if invalid
   */
  validateUserCredentials(name: string, password: string): Promise<User | null>;
  
  /**
   * Checks if a username is already taken.
   * @param name Username to check
   * @param excludeId Optional user ID to exclude from the check
   * @returns Promise resolving to true if the name is taken
   */
  isNameTaken(name: string, excludeId?: number): Promise<boolean>;
  
  /**
   * Updates a user's password.
   * @param id User ID
   * @param newPassword New password
   * @returns Promise that resolves when the password is updated
   */
  updatePassword(id: number, newPassword: string): Promise<void>;
  
  /**
   * Updates a user's role.
   * @param id User ID
   * @param newRole New role
   * @returns Promise resolving to the updated User entity
   */
  updateRole(id: number, newRole: string): Promise<User>;
  
  /**
   * Counts users by role for analytics.
   * @param role Role to count
   * @returns Promise resolving to the count of users with the specified role
   */
  countByRole(role: string): Promise<number>;
  
  /**
   * Finds all active users.
   * @returns Promise resolving to an array of active User entities
   */
  findActiveUsers(): Promise<User[]>;
  
  /**
   * Legacy method for backward compatibility.
   * Creates a new user entity.
   * @param user User entity to create
   * @returns Promise resolving to the created User entity
   */
  create(user: User): Promise<User>;
}

