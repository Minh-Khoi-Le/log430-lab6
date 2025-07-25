import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { UserDTO } from '../dtos/user.dto';

/**
 * Use case for creating a new user.
 * Handles the business logic for user creation and validation.
 */
export class CreateUserUseCase {
  /**
   * @param userRepository Repository for user persistence operations
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Executes the user creation use case.
   * @param userData User data transfer object containing user information
   * @returns Promise resolving to the created User entity
   */
  async execute(userData: UserDTO): Promise<User> {
    const user = new User(userData.id, userData.name, userData.role, userData.password);
    return await this.userRepository.create(user);
  }
}