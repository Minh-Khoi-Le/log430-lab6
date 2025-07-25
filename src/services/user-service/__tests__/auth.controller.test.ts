import { Request, Response } from 'express';
import { AuthController } from '../infrastructure/http/auth.controller';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../domain/repositories/user.repository';

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@shared/infrastructure/caching');
jest.mock('@shared/infrastructure/logging', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }))
}));

// Mock the user repository
const mockUserRepository = {
  validateUserCredentials: jest.fn(),
  save: jest.fn(),
  findByName: jest.fn(),
  findByRole: jest.fn(),
  isNameTaken: jest.fn(),
  updatePassword: jest.fn(),
  updateRole: jest.fn(),
  countByRole: jest.fn(),
  findActiveUsers: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  saveMany: jest.fn(),
  deleteMany: jest.fn(),
  findWithPagination: jest.fn(),
} as jest.Mocked<IUserRepository>;

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    authController = new AuthController(mockUserRepository);
    
    mockRequest = {
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        name: 'testuser',
        password: 'password123'
      };

      const mockUser = {
        id: 1,
        name: 'testuser',
        role: 'client',
        password: 'hashedpassword'
      };

      mockRequest.body = loginData;
      mockUserRepository.validateUserCredentials.mockResolvedValue(mockUser as any);
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserRepository.validateUserCredentials).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        user: { id: 1, name: 'testuser', role: 'client' },
        token: 'mock-jwt-token'
      });
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        name: 'testuser',
        password: 'wrongpassword'
      };

      mockRequest.body = loginData;
      mockUserRepository.validateUserCredentials.mockResolvedValue(null);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return error when user not found', async () => {
      const loginData = {
        name: 'nonexistentuser',
        password: 'password123'
      };

      mockRequest.body = loginData;
      mockUserRepository.validateUserCredentials.mockResolvedValue(null);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should handle database errors', async () => {
      const loginData = {
        name: 'testuser',
        password: 'password123'
      };

      mockRequest.body = loginData;
      mockUserRepository.validateUserCredentials.mockRejectedValue(new Error('Database connection failed'));

      // Silence console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });

      console.error = originalError;
    });
  });
});
