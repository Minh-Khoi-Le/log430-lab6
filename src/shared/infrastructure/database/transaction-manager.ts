import { Prisma } from "@prisma/client";
import { IDatabaseManager } from "./database-manager";
import { createLogger } from "../logging";

const logger = createLogger("transaction-manager");

export interface ITransactionManager {
  executeInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T>;
  executeWithRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries?: number,
    retryDelay?: number
  ): Promise<T>;
  executeBatch<T>(
    operations: Array<(tx: Prisma.TransactionClient) => Promise<T>>
  ): Promise<T[]>;
  executeConditional<T>(
    condition: (tx: Prisma.TransactionClient) => Promise<boolean>,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    fallback?: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T | null>;
}

export class TransactionManager implements ITransactionManager {
  private readonly databaseManager: IDatabaseManager;
  private defaultMaxRetries: number = 3;
  private defaultRetryDelay: number = 1000; // 1 second
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultMaxWait: number = 5000; // 5 seconds

  constructor(databaseManager: IDatabaseManager) {
    this.databaseManager = databaseManager;
  }

  public async executeInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    try {
      logger.info("Starting transaction execution");
      const startTime = Date.now();

      const result = await this.databaseManager.executeInTransaction(operation);

      const duration = Date.now() - startTime;
      logger.info("Transaction completed successfully", { duration });

      return result;
    } catch (error) {
      logger.error("Transaction execution failed", error as Error);
      throw error;
    }
  }

  public async executeWithRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries: number = this.defaultMaxRetries,
    retryDelay: number = this.defaultRetryDelay
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info("Attempting transaction with retry", {
          attempt,
          maxRetries,
        });

        const result = await this.executeInTransaction(operation);

        if (attempt > 1) {
          logger.info("Transaction succeeded after retry", { attempt });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        logger.warn("Transaction attempt failed", lastError);

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === maxRetries) {
          logger.error("Transaction failed permanently", lastError, {
            attempt,
            maxRetries,
          });
          throw lastError;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        logger.info("Waiting before retry", { delay, attempt });
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error during transaction execution');
  }

  public async executeBatch<T>(
    operations: Array<(tx: Prisma.TransactionClient) => Promise<T>>
  ): Promise<T[]> {
    if (operations.length === 0) {
      logger.info("No operations to execute in batch");
      return [];
    }

    try {
      logger.info("Starting batch transaction execution", {
        operationCount: operations.length,
      });
      const startTime = Date.now();

      const results = await this.executeInTransaction(async (tx) => {
        const batchResults: T[] = [];

        for (let i = 0; i < operations.length; i++) {
          logger.info("Executing batch operation", {
            index: i,
            total: operations.length,
          });

          try {
            const result = await operations[i](tx);
            batchResults.push(result);
          } catch (error) {
            logger.error("Batch operation failed", error as Error, {
              index: i,
            });
            throw error;
          }
        }

        return batchResults;
      });

      const duration = Date.now() - startTime;
      logger.info("Batch transaction completed successfully", {
        operationCount: operations.length,
        duration,
      });

      return results;
    } catch (error) {
      logger.error("Batch transaction execution failed", error as Error, {
        operationCount: operations.length,
      });
      throw error;
    }
  }

  public async executeConditional<T>(
    condition: (tx: Prisma.TransactionClient) => Promise<boolean>,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    fallback?: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T | null> {
    try {
      logger.info("Starting conditional transaction execution");

      const result = await this.executeInTransaction(async (tx) => {
        const conditionResult = await condition(tx);
        logger.info("Condition evaluation result", { conditionResult });

        if (conditionResult) {
          logger.info("Condition met, executing main operation");
          return await operation(tx);
        } else if (fallback) {
          logger.info("Condition not met, executing fallback operation");
          return await fallback(tx);
        } else {
          logger.info("Condition not met, no fallback provided");
          return null;
        }
      });

      logger.info("Conditional transaction completed");
      return result;
    } catch (error) {
      logger.error("Conditional transaction execution failed", error as Error);
      throw error;
    }
  }

  // Utility methods for transaction coordination
  public async executeWithTimeout<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    timeoutMs: number = this.defaultTimeout
  ): Promise<T> {
    try {
      logger.info("Starting transaction with timeout", { timeoutMs });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const operationPromise = this.executeInTransaction(operation);

      const result = await Promise.race([operationPromise, timeoutPromise]);

      logger.info("Transaction with timeout completed successfully");
      return result;
    } catch (error) {
      logger.error("Transaction with timeout failed", error as Error, {
        timeoutMs,
      });
      throw error;
    }
  }

  public async executeWithDeadlockRetry<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries: number = 5
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      maxRetries,
      100 + Math.random() * 100 // Random delay between 100-200ms to avoid thundering herd
    );
  }

  // Cross-service transaction coordination
  public async executeDistributedTransaction<T>(
    operations: Array<{
      name: string;
      operation: (tx: Prisma.TransactionClient) => Promise<T>;
      compensate?: (tx: Prisma.TransactionClient) => Promise<void>;
    }>
  ): Promise<T[]> {
    const completedOperations: Array<{
      name: string;
      compensate?: (tx: Prisma.TransactionClient) => Promise<void>;
    }> = [];

    try {
      logger.info("Starting distributed transaction", {
        operationCount: operations.length,
      });

      const results = await this.executeInTransaction(async (tx) => {
        const distributedResults: T[] = [];

        for (const { name, operation, compensate } of operations) {
          try {
            logger.info("Executing distributed operation", { name });
            const result = await operation(tx);
            distributedResults.push(result);
            completedOperations.push({ name, compensate });
          } catch (error) {
            logger.error("Distributed operation failed", error as Error, {
              name,
            });

            // Execute compensation for completed operations in reverse order
            const reversedOperations = [...completedOperations].reverse();
            await this.executeCompensation(tx, reversedOperations);

            throw error;
          }
        }

        return distributedResults;
      });

      logger.info("Distributed transaction completed successfully");
      return results;
    } catch (error) {
      logger.error("Distributed transaction failed", error as Error);
      throw error;
    }
  }

  private async executeCompensation(
    tx: Prisma.TransactionClient,
    operations: Array<{
      name: string;
      compensate?: (tx: Prisma.TransactionClient) => Promise<void>;
    }>
  ): Promise<void> {
    logger.info("Executing compensation operations", {
      count: operations.length,
    });

    for (const { name, compensate } of operations) {
      if (compensate) {
        try {
          logger.info("Executing compensation", { name });
          await compensate(tx);
        } catch (compensationError) {
          logger.error("Compensation failed", compensationError as Error, {
            name,
          });
          // Continue with other compensations even if one fails
        }
      }
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "P2034", // Transaction conflict
      "P2028", // Transaction API error
      "P2024", // Timed out fetching a new connection from the connection pool
      "P1001", // Can't reach database server
      "P1002", // The database server was reached but timed out
    ];

    // Check if it's a Prisma error with a retryable code
    if ("code" in error) {
      return retryableErrors.includes((error as any).code);
    }

    // Check for common database connection errors
    const errorMessage = error.message.toLowerCase();
    const retryableMessages = [
      "connection",
      "timeout",
      "deadlock",
      "lock",
      "conflict",
      "serialization",
    ];

    return retryableMessages.some((msg) => errorMessage.includes(msg));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Configuration methods
  public setDefaultRetryConfig(maxRetries: number, retryDelay: number): void {
    this.defaultMaxRetries = maxRetries;
    this.defaultRetryDelay = retryDelay;
    logger.info("Updated default retry configuration", {
      maxRetries,
      retryDelay,
    });
  }

  public setDefaultTimeoutConfig(timeout: number, maxWait: number): void {
    this.defaultTimeout = timeout;
    this.defaultMaxWait = maxWait;
    logger.info("Updated default timeout configuration", { timeout, maxWait });
  }
}
