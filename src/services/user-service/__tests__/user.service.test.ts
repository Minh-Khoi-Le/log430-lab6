import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { User } from '../domain/entities/user.entity';

// Mock the UserRepository
const mockUserRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  saveMany: jest.fn(),
  deleteMany: jest.fn(),
  findWithPagination: jest.fn(),
  findByRole: jest.fn(),
  validateUserCredentials: jest.fn(),
  isNameTaken: jest.fn(),
  updatePassword: jest.fn(),
  updateRole: jest.fn(),
  countByRole: jest.fn(),
  findActiveUsers: jest.fn(),
};

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;

  beforeEach(() => {
    createUserUseCase = new CreateUserUseCase(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a user successfully', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        role: 'client',
        password: 'password123'
      };

      const expectedUser = new User(1, 'John Doe', 'client', 'password123');
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await createUserUseCase.execute(userData);

      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: 'John Doe',
          role: 'client',
          password: 'password123'
        })
      );
    });

    it('should create a user with default role when not specified', async () => {
      const userData = {
        id: 2,
        name: 'Jane Doe',
        password: 'password456'
      };

      const expectedUser = new User(2, 'Jane Doe', 'client', 'password456');
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await createUserUseCase.execute(userData as any);

      expect(result.role).toBe('client');
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const userData = {
        id: 3,
        name: 'Error User',
        role: 'admin',
        password: 'password789'
      };

      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(createUserUseCase.execute(userData))
        .rejects.toThrow('Database error');
    });
  });
});
