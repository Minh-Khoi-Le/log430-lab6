import { Prisma } from "@prisma/client";
import { IDatabaseManager } from "./database-manager";
import { createLogger } from "../logging";

const logger = createLogger("base-repository");

export interface IBaseRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: Omit<T, "id">): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
  count(): Promise<number>;
  saveMany(entities: Omit<T, "id">[]): Promise<T[]>;
  deleteMany(ids: ID[]): Promise<void>;
  findWithPagination(
    page?: number,
    limit?: number,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

export abstract class BaseRepository<T, ID> implements IBaseRepository<T, ID> {
  protected databaseManager: IDatabaseManager;
  protected modelName: string;

  constructor(databaseManager: IDatabaseManager, modelName: string) {
    this.databaseManager = databaseManager;
    this.modelName = modelName;
  }

  protected get prisma() {
    return this.databaseManager.getClient();
  }

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  public async findById(id: ID): Promise<T | null> {
    try {
      logger.info(`Finding ${this.modelName} by ID`, {
        id,
        modelName: this.modelName,
      });
      const result = await this.model.findUnique({
        where: { id },
      });
      logger.info(`Found ${this.modelName}`, { id, found: !!result });
      return result;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by ID`, error as Error, {
        id,
      });
      throw error;
    }
  }

  public async findAll(): Promise<T[]> {
    try {
      logger.info(`Finding all ${this.modelName} records`);
      const results = await this.model.findMany();
      logger.info(`Found ${this.modelName} records`, {
        count: results.length,
      });
      return results;
    } catch (error) {
      logger.error(
        `Error finding all ${this.modelName} records`,
        error as Error
      );
      throw error;
    }
  }

  public async save(entity: Omit<T, "id">): Promise<T> {
    try {
      logger.info(`Creating new ${this.modelName}`, { entity });
      const result = await this.model.create({
        data: entity,
      });
      logger.info(`Created ${this.modelName}`, { id: result.id });
      return result;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}`, error as Error, {
        entity,
      });
      throw error;
    }
  }

  public async update(id: ID, entity: Partial<T>): Promise<T> {
    try {
      logger.info(`Updating ${this.modelName}`, { id, entity });
      const result = await this.model.update({
        where: { id },
        data: entity,
      });
      logger.info(`Updated ${this.modelName}`, { id });
      return result;
    } catch (error) {
      logger.error(`Error updating ${this.modelName}`, error as Error, {
        id,
        entity,
      });
      throw error;
    }
  }

  public async delete(id: ID): Promise<void> {
    try {
      logger.info(`Deleting ${this.modelName}`, { id });
      await this.model.delete({
        where: { id },
      });
      logger.info(`Deleted ${this.modelName}`, { id });
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}`, error as Error, { id });
      throw error;
    }
  }

  public async exists(id: ID): Promise<boolean> {
    try {
      logger.info(`Checking if ${this.modelName} exists`, { id });
      const result = await this.model.findUnique({
        where: { id },
        select: { id: true },
      });
      const exists = !!result;
      logger.info(`${this.modelName} existence check`, { id, exists });
      return exists;
    } catch (error) {
      logger.error(
        `Error checking ${this.modelName} existence`,
        error as Error,
        { id }
      );
      throw error;
    }
  }

  public async count(): Promise<number> {
    try {
      logger.info(`Counting ${this.modelName} records`);
      const count = await this.model.count();
      logger.info(`${this.modelName} count result`, { count });
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.modelName} records`, error as Error);
      throw error;
    }
  }

  // Transaction support methods
  protected async executeInTransaction<R>(
    operation: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    return this.databaseManager.executeInTransaction(operation);
  }

  // Batch operations
  public async saveMany(entities: Omit<T, "id">[]): Promise<T[]> {
    try {
      logger.info(`Creating multiple ${this.modelName} records`, {
        count: entities.length,
      });
      const results = await this.executeInTransaction(async (tx) => {
        const createdEntities: T[] = [];
        for (const entity of entities) {
          const created = await (tx as any)[this.modelName].create({
            data: entity,
          });
          createdEntities.push(created);
        }
        return createdEntities;
      });
      logger.info(`Created multiple ${this.modelName} records`, {
        count: results.length,
      });
      return results;
    } catch (error) {
      logger.error(
        `Error creating multiple ${this.modelName} records`,
        error as Error,
        { count: entities.length }
      );
      throw error;
    }
  }

  public async deleteMany(ids: ID[]): Promise<void> {
    try {
      logger.info(`Deleting multiple ${this.modelName} records`, { ids });
      await this.model.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      logger.info(`Deleted multiple ${this.modelName} records`, {
        count: ids.length,
      });
    } catch (error) {
      logger.error(
        `Error deleting multiple ${this.modelName} records`,
        error as Error,
        { ids }
      );
      throw error;
    }
  }

  // Pagination support
  public async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: any,
    orderBy?: any
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      logger.info(`Finding ${this.modelName} with pagination`, {
        page,
        limit,
        skip,
      });

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.model.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info(`Found ${this.modelName} with pagination`, {
        count: data.length,
        total,
        page,
        totalPages,
      });

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error(
        `Error finding ${this.modelName} with pagination`,
        error as Error,
        { page, limit }
      );
      throw error;
    }
  }
}
