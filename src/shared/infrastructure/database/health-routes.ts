import { Router } from 'express';
import { healthCheckMiddleware, simpleHealthCheck } from './health-check';
import { register } from '../metrics';

export function createHealthRoutes(): Router {
  const router = Router();
  
  // Simple health check for load balancers
  router.get('/health', simpleHealthCheck);
  
  // Detailed health check with metrics
  router.get('/health/detailed', healthCheckMiddleware);
  
  // Database-specific health check
  router.get('/health/database', healthCheckMiddleware);
  
  // Prometheus metrics endpoint
  router.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end('Error collecting metrics');
    }
  });
  
  return router;
}

export default createHealthRoutes;