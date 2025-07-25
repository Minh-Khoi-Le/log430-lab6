import { User } from '../entities/user.entity';
import { IUserRepository } from '../repositories/user.repository';

/**
 * Domain service for user business logic.
 * Handles user operations and enforces business rules.
 */
export class UserService {
  /**
   * @param userRepository User repository for data operations
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * Creates a new user with validation.
   * @param userData Partial user data
   * @returns Promise resolving to the created User entity
   */
  async createUser(userData: Partial<User>): Promise<User> {
    return await this.userRepository.save({
      name: userData.name ?? '',
      role: userData.role ?? 'client',
      password: userData.password ?? ''
    });
  }

  /**
   * Retrieves a user by their ID.
   * @param userId User ID
   * @returns Promise resolving to the User entity or null if not found
   */
  async getUserById(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Retrieves all users.
   * @returns Promise resolving to an array of User entities
   */
  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  /**
   * Updates an existing user.
   * @param userId User ID
   * @param userData Partial user data for update
   * @returns Promise resolving to the updated User entity or null if not found
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }
    
    return await this.userRepository.update(userId, userData);
  }

  /**
   * Deletes a user by ID.
   * @param userId User ID
   * @returns Promise resolving to true if deleted, false if not found
   */
  async deleteUser(userId: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }
    await this.userRepository.delete(userId);
    return true;
  }
}