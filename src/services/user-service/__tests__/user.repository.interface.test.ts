import { User } from '../domain/entities/user.entity';
import { IUserRepository } from '../domain/repositories/user.repository';

// Mock implementation for testing interface contracts
class MockUserRepository implements IUserRepository {
  private users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users];
  }

  async save(entity: Omit<User, 'id'>): Promise<User> {
    const user = new User(this.nextId++, entity.name, entity.role, entity.password);
    this.users.push(user);
    return user;
  }

  async update(id: number, entity: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...this.users[userIndex], ...entity };
    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  async delete(id: number): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    this.users.splice(userIndex, 1);
  }

  async exists(id: number): Promise<boolean> {
    return this.users.some(user => user.id === id);
  }

  async count(): Promise<number> {
    return this.users.length;
  }

  async findByName(name: string): Promise<User | null> {
    return this.users.find(user => user.name === name) || null;
  }

  async findByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role);
  }

  async validateUserCredentials(name: string, password: string): Promise<User | null> {
    return this.users.find(user => user.name === name && user.password === password) || null;
  }

  async isNameTaken(name: string, excludeId?: number): Promise<boolean> {
    return this.users.some(user => user.name === name && user.id !== excludeId);
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const user = this.users.find(user => user.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    user.password = newPassword;
  }

  async updateRole(id: number, newRole: string): Promise<User> {
    const user = this.users.find(user => user.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    user.role = newRole;
    return user;
  }

  async countByRole(role: string): Promise<number> {
    return this.users.filter(user => user.role === role).length;
  }

  async findActiveUsers(): Promise<User[]> {
    // For this mock, all users are considered active
    return [...this.users];
  }

  // Legacy method for backward compatibility
  async create(user: User): Promise<User> {
    return this.save(user);
  }

  async saveMany(entities: Omit<User, "id">[]): Promise<User[]> {
    const results: User[] = [];
    for (const entity of entities) {
      const saved = await this.save(entity);
      results.push(saved);
    }
    return results;
  }

  async deleteMany(ids: number[]): Promise<void> {
    this.users = this.users.filter(user => !ids.includes(user.id));
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let filteredUsers = [...this.users];
    
    // Simple where filtering (for testing purposes)
    if (where) {
      filteredUsers = filteredUsers.filter(user => {
        return Object.keys(where).every(key => (user as any)[key] === where[key]);
      });
    }

    const total = filteredUsers.length;
    const skip = (page - 1) * limit;
    const data = filteredUsers.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}

describe('IUserRepository Interface Contract Tests', () => {
  let repository: IUserRepository;

  beforeEach(() => {
    repository = new MockUserRepository();
  });

  describe('Base Repository Methods', () => {
    test('should save and find user by id', async () => {
      const userData = { name: 'testuser', role: 'client', password: 'password123' };
      const savedUser = await repository.save(userData);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.role).toBe(userData.role);

      const foundUser = await repository.findById(savedUser.id);
      expect(foundUser).toEqual(savedUser);
    });

    test('should return null when user not found by id', async () => {
      const foundUser = await repository.findById(999);
      expect(foundUser).toBeNull();
    });

    test('should find all users', async () => {
      await repository.save({ name: 'user1', role: 'client', password: 'pass1' });
      await repository.save({ name: 'user2', role: 'admin', password: 'pass2' });

      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(2);
    });

    test('should update user', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'password' });
      const updatedUser = await repository.update(user.id, { name: 'updateduser' });

      expect(updatedUser.name).toBe('updateduser');
      expect(updatedUser.role).toBe('client'); // unchanged
    });

    test('should delete user', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'password' });
      await repository.delete(user.id);

      const foundUser = await repository.findById(user.id);
      expect(foundUser).toBeNull();
    });

    test('should check if user exists', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'password' });
      
      const exists = await repository.exists(user.id);
      expect(exists).toBe(true);

      const notExists = await repository.exists(999);
      expect(notExists).toBe(false);
    });

    test('should count users', async () => {
      expect(await repository.count()).toBe(0);

      await repository.save({ name: 'user1', role: 'client', password: 'pass1' });
      await repository.save({ name: 'user2', role: 'admin', password: 'pass2' });

      expect(await repository.count()).toBe(2);
    });
  });

  describe('User-Specific Domain Methods', () => {
    test('should find user by name', async () => {
      const userData = { name: 'testuser', role: 'client', password: 'password123' };
      await repository.save(userData);

      const foundUser = await repository.findByName('testuser');
      expect(foundUser).not.toBeNull();
      expect(foundUser!.name).toBe('testuser');

      const notFound = await repository.findByName('nonexistent');
      expect(notFound).toBeNull();
    });

    test('should find users by role', async () => {
      await repository.save({ name: 'admin1', role: 'admin', password: 'pass1' });
      await repository.save({ name: 'client1', role: 'client', password: 'pass2' });
      await repository.save({ name: 'admin2', role: 'admin', password: 'pass3' });

      const admins = await repository.findByRole('admin');
      expect(admins).toHaveLength(2);
      expect(admins.every(user => user.role === 'admin')).toBe(true);

      const clients = await repository.findByRole('client');
      expect(clients).toHaveLength(1);
      expect(clients[0].role).toBe('client');
    });

    test('should validate user credentials', async () => {
      await repository.save({ name: 'testuser', role: 'client', password: 'correctpassword' });

      const validUser = await repository.validateUserCredentials('testuser', 'correctpassword');
      expect(validUser).not.toBeNull();
      expect(validUser!.name).toBe('testuser');

      const invalidUser = await repository.validateUserCredentials('testuser', 'wrongpassword');
      expect(invalidUser).toBeNull();

      const nonexistentUser = await repository.validateUserCredentials('nonexistent', 'password');
      expect(nonexistentUser).toBeNull();
    });

    test('should check if name is taken', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'password' });

      const isTaken = await repository.isNameTaken('testuser');
      expect(isTaken).toBe(true);

      const isNotTaken = await repository.isNameTaken('newuser');
      expect(isNotTaken).toBe(false);

      // Test excluding current user ID
      const isTakenExcludingSelf = await repository.isNameTaken('testuser', user.id);
      expect(isTakenExcludingSelf).toBe(false);
    });

    test('should update user password', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'oldpassword' });
      
      await repository.updatePassword(user.id, 'newpassword');
      
      const validUser = await repository.validateUserCredentials('testuser', 'newpassword');
      expect(validUser).not.toBeNull();

      const invalidUser = await repository.validateUserCredentials('testuser', 'oldpassword');
      expect(invalidUser).toBeNull();
    });

    test('should update user role', async () => {
      const user = await repository.save({ name: 'testuser', role: 'client', password: 'password' });
      
      const updatedUser = await repository.updateRole(user.id, 'admin');
      expect(updatedUser.role).toBe('admin');

      const foundUser = await repository.findById(user.id);
      expect(foundUser!.role).toBe('admin');
    });

    test('should count users by role', async () => {
      await repository.save({ name: 'admin1', role: 'admin', password: 'pass1' });
      await repository.save({ name: 'client1', role: 'client', password: 'pass2' });
      await repository.save({ name: 'admin2', role: 'admin', password: 'pass3' });

      const adminCount = await repository.countByRole('admin');
      expect(adminCount).toBe(2);

      const clientCount = await repository.countByRole('client');
      expect(clientCount).toBe(1);

      const managerCount = await repository.countByRole('manager');
      expect(managerCount).toBe(0);
    });

    test('should find active users', async () => {
      await repository.save({ name: 'user1', role: 'client', password: 'pass1' });
      await repository.save({ name: 'user2', role: 'admin', password: 'pass2' });

      const activeUsers = await repository.findActiveUsers();
      expect(activeUsers).toHaveLength(2);
    });
  });

  describe('Legacy Compatibility', () => {
    test('should support legacy create method', async () => {
      const user = new User(0, 'testuser', 'client', 'password');
      const createdUser = await repository.create(user);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe('testuser');
      expect(createdUser.role).toBe('client');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when updating non-existent user', async () => {
      await expect(repository.update(999, { name: 'newname' }))
        .rejects.toThrow('User not found');
    });

    test('should throw error when deleting non-existent user', async () => {
      await expect(repository.delete(999))
        .rejects.toThrow('User not found');
    });

    test('should throw error when updating password for non-existent user', async () => {
      await expect(repository.updatePassword(999, 'newpassword'))
        .rejects.toThrow('User not found');
    });

    test('should throw error when updating role for non-existent user', async () => {
      await expect(repository.updateRole(999, 'admin'))
        .rejects.toThrow('User not found');
    });
  });
});