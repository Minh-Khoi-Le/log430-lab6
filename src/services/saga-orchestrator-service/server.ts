import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import shared infrastructure
import { redisClient, CacheService } from '@shared/infrastructure/caching';
import { createLogger } from '@shared/infrastructure/logging';
import { register, metricsMiddleware, collectSystemMetrics } from '@shared/infrastructure/metrics';
import { databaseManager } from '@shared/infrastructure/database/database-manager';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;
const SERVICE_NAME = 'saga-orchestrator-service';

// Initialize system metrics collection
collectSystemMetrics(SERVICE_NAME);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware(SERVICE_NAME));

// Create a logger for the service
const logger = createLogger('saga-orchestrator-service');

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize cache
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error);
    logger.warn('Service will operate without caching');
  }

  try {
    // Initialize database
    await databaseManager.ensureConnection();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', error as Error);
    throw error;
  }
};

// Create cache service with proper service name
const cacheService = new CacheService(redisClient, 'saga-orchestrator-service');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await databaseManager.ensureConnection();
    
    // Check Redis connection (optional)
    let redisStatus = 'disconnected';
    try {
      if (redisClient.isConnected) {
        redisStatus = 'connected';
      }
    } catch (error) {
      // Redis is optional, so we don't fail the health check
    }

    res.json({ 
      status: 'healthy', 
      service: 'saga-orchestrator-service',
      database: 'connected',
      redis: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed', error as Error);
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'saga-orchestrator-service',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

// Placeholder for saga routes - will be implemented in later tasks
app.get('/api/sagas', (req, res) => {
  res.json({ message: 'Saga orchestrator service is running', version: '1.0.0' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server with proper initialization
const startServer = async () => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      logger.info(`Saga Orchestrator Service running on port ${PORT}`);
      console.log(`Saga Orchestrator Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  console.log('SIGTERM received, shutting down gracefully');
  await databaseManager.disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err));
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  console.log('SIGINT received, shutting down gracefully');
  await databaseManager.disconnect();
  await redisClient.disconnect().catch(err => logger.error('Error disconnecting Redis', err));
  process.exit(0);
});

export default app;