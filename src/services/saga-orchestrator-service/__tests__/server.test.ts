import request from 'supertest';
import app from '../server';

describe('Saga Orchestrator Service', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        service: 'saga-orchestrator-service',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Metrics', () => {
    it('should return metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('API Routes', () => {
    it('should return service info for saga endpoint', async () => {
      const response = await request(app)
        .get('/api/sagas')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Saga orchestrator service is running',
        version: '1.0.0'
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not found'
      });
    });
  });
});