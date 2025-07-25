/**
 * Redis Client Service
 *
 * Provides a Redis client wrapper with connection management and error handling.
 */

import { createClient, RedisClientOptions } from "redis";
import { createLogger } from "../logging";

// Define a more specific type for our Redis client
type RedisClientType = ReturnType<typeof createClient>;

// Create a logger for the Redis client
const logger = createLogger("redis-client");

// Redis connection configuration
export interface RedisConfig {
  url?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  password?: string | undefined;
  username?: string | undefined;
  db?: number | undefined;
  tls?: boolean | undefined;
}

// Default Redis configuration
const DEFAULT_CONFIG: RedisConfig = {
  url: process.env["REDIS_URL"] ?? undefined,
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: process.env["REDIS_PORT"]
    ? parseInt(process.env["REDIS_PORT"], 10)
    : 6379,
  password: process.env["REDIS_PASSWORD"] ?? undefined,
  username: process.env["REDIS_USERNAME"] ?? undefined,
  db: process.env["REDIS_DB"] ? parseInt(process.env["REDIS_DB"], 10) : 0,
  tls: process.env["REDIS_TLS"] === "true",
};

/**
 * Redis Client Class
 *
 * Provides a wrapper around the Redis client with connection management,
 * error handling, and reconnection strategies.
 */
export class RedisClient {
  private readonly client: RedisClientType;
  private _isConnected: boolean = false;
  private readonly config: RedisConfig;

  /**
   * Creates a new Redis client instance
   *
   * @param config Redis connection configuration
   */
  constructor(config: RedisConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create the Redis client
    this.client = this.createRedisClient();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Check if the client is connected to Redis
   */
  public get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get the underlying Redis client
   * (Use with caution - prefer using the provided methods)
   */
  public get redisClient(): RedisClientType {
    return this.client;
  }

  /**
   * Creates a Redis client with the configured options
   */
  private createRedisClient(): RedisClientType {
    // Determine connection options
    const connectionOptions: RedisClientOptions = {
      socket: {},
    };

    if (this.config.url) {
      // Use URL if provided
      connectionOptions.url = this.config.url;
    } else {
      // Otherwise use individual connection parameters
      connectionOptions.socket = {
        host: this.config.host ?? "localhost",
        port: this.config.port ?? 6379,
      };
      
      // Add TLS if configured
      if (this.config.tls) {
        (connectionOptions.socket as any).tls = true;
      }

      if (this.config.username) {
        connectionOptions.username = this.config.username;
      }

      if (this.config.password) {
        connectionOptions.password = this.config.password;
      }

      if (this.config.db !== undefined) {
        connectionOptions.database = this.config.db;
      }
    }

    // Add common options
    connectionOptions.socket ??= {};
    connectionOptions.socket.reconnectStrategy = (
      retries: number
    ): number | Error => {
      // Maximum retry delay is 30 seconds
      const delay = Math.min(retries * 100, 30000);
      logger.warn(`Redis reconnect attempt ${retries}`, { delay });
      return delay;
    };

    return createClient(connectionOptions);
  }

  /**
   * Sets up event handlers for the Redis client
   */
  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      logger.info("Redis client connected");
      this._isConnected = true;
    });

    this.client.on("ready", () => {
      logger.info("Redis client ready");
      this._isConnected = true;
    });

    this.client.on("error", (err) => {
      logger.error("Redis client error", err);
      this._isConnected = false;
    });

    this.client.on("end", () => {
      logger.warn("Redis client disconnected");
      this._isConnected = false;
    });

    this.client.on("reconnecting", () => {
      logger.info("Redis client reconnecting");
      this._isConnected = false;
    });
  }

  /**
   * Connects to Redis server
   */
  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info("Successfully connected to Redis");
      this._isConnected = true;
    } catch (error) {
      logger.error("Failed to connect to Redis", error as Error);
      this._isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnects from Redis server
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info("Redis client disconnected gracefully");
        this._isConnected = false;
      } catch (error) {
        logger.error("Error disconnecting Redis client", error as Error);
        this._isConnected = false;
        throw error;
      }
    }
  }

  /**
   * Gets Redis server info
   */
  public async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error("Failed to get Redis info", error as Error);
      throw error;
    }
  }
}

// Create and export a default Redis client instance
const redisClient = new RedisClient();
export default redisClient;
