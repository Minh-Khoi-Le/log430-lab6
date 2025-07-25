/**
 * k6 Load Testing Configuration
 * 
 * This configuration file defines the testing environment settings,
 * API endpoints, and common test parameters for the LOG430 Lab 6
 * Retail Store Management System.
 */

export const CONFIG = {
  // Environment settings
  BASE_URL: __ENV.BASE_URL || 'http://localhost:8000',
  API_KEY: __ENV.API_KEY || 'frontend-app-key-12345',
  
  // Test execution settings
  THINK_TIME: {
    MIN: 1,
    MAX: 3
  },
  
  // Request timeout settings
  TIMEOUT: '30s',
  
  // Response time thresholds (in milliseconds)
  THRESHOLDS: {
    FAST: 500,      // Fast response (< 500ms)
    ACCEPTABLE: 1000, // Acceptable response (< 1s)
    SLOW: 2000,     // Slow but tolerable (< 2s)
    CRITICAL: 5000  // Critical threshold (< 5s)
  },
  
  // Database warmup data
  TEST_DATA: {
    USERS: [
      { name: 'admin', password: 'admin123', role: 'admin' },
      { name: 'manager', password: 'manager123', role: 'manager' },
      { name: 'client1', password: 'client123', role: 'client' },
      { name: 'client2', password: 'client456', role: 'client' },
      { name: 'client3', password: 'client789', role: 'client' }
    ],
    PRODUCTS: [
      { name: 'Laptop Pro', price: 1299.99, category: 'Electronics' },
      { name: 'Smartphone X', price: 699.99, category: 'Electronics' },
      { name: 'Wireless Headphones', price: 149.99, category: 'Electronics' },
      { name: 'Coffee Maker', price: 79.99, category: 'Appliances' },
      { name: 'Running Shoes', price: 89.99, category: 'Sports' }
    ],
    STORES: [
      { name: 'Downtown Store', address: '123 Main St', status: 'active' },
      { name: 'Mall Location', address: '456 Shopping Center', status: 'active' },
      { name: 'Airport Branch', address: '789 Airport Rd', status: 'active' }
    ]
  }
};

// API endpoints configuration
export const ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me'
  },
  
  // User management endpoints
  USERS: {
    BASE: '/api/users',
    BY_ID: (id) => `/api/users/${id}`
  },
  
  // Product catalog endpoints
  PRODUCTS: {
    BASE: '/api/products',
    BY_ID: (id) => `/api/products/${id}`,
    SEARCH: '/api/products/search'
  },
  
  // Store management endpoints
  STORES: {
    BASE: '/api/stores',
    BY_ID: (id) => `/api/stores/${id}`,
    SEARCH: '/api/stores/search'
  },
  
  // Stock management endpoints
  STOCK: {
    BASE: '/api/stock',
    BY_ID: (id) => `/api/stock/${id}`,
    BY_STORE: (storeId) => `/api/stock/store/${storeId}`,
    BY_PRODUCT: (productId) => `/api/stock/product/${productId}`,
    LOW_STOCK: '/api/stock/low',
    RESERVE: '/api/stock/reserve',
    ADJUST: '/api/stock/adjust'
  },
  
  // Sales transaction endpoints
  SALES: {
    BASE: '/api/sales',
    BY_ID: (id) => `/api/sales/${id}`,
    BY_USER: (userId) => `/api/sales/user/${userId}`,
    BY_STORE: (storeId) => `/api/sales/store/${storeId}`,
    SUMMARY: '/api/sales/summary',
    UPDATE_STATUS: (id) => `/api/sales/${id}/status`
  },
  
  // Refund processing endpoints
  REFUNDS: {
    BASE: '/api/refunds',
    BY_ID: (id) => `/api/refunds/${id}`,
    BY_USER: (userId) => `/api/refunds/user/${userId}`,
    BY_STORE: (storeId) => `/api/refunds/store/${storeId}`,
    BY_SALE: (saleId) => `/api/refunds/sale/${saleId}`,
    SUMMARY: '/api/refunds/summary'
  },
  
  // Health check endpoints
  HEALTH: {
    USER_SERVICE: '/health',
    CATALOG_SERVICE: '/health',
    TRANSACTION_SERVICE: '/health'
  }
};

// Test stage configurations
export const STAGES = {
  // Smoke test - minimal load
  SMOKE: [
    { duration: '1m', target: 5 }
  ],
  
  // Load test - normal expected load
  LOAD: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 20 },   // Stay at normal load
    { duration: '2m', target: 0 }     // Ramp down
  ],
  
  // Stress test - above normal load
  STRESS: [
    { duration: '2m', target: 20 },   // Ramp up to normal
    { duration: '5m', target: 50 },   // Ramp up to stress level
    { duration: '10m', target: 50 },  // Stay at stress level
    { duration: '2m', target: 20 },   // Scale back to normal
    { duration: '2m', target: 0 }     // Ramp down
  ],
  
  // Spike test - sudden load increase
  SPIKE: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 100 }, // Sudden spike
    { duration: '1m', target: 10 },   // Back to normal
    { duration: '30s', target: 0 }    // Ramp down
  ],
  
  // Soak test - sustained load over time
  SOAK: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '30m', target: 20 },  // Stay at load for extended period
    { duration: '2m', target: 0 }     // Ramp down
  ],
  
  // Multi-user concurrent test - realistic user distribution
  MULTI_USER: [
    { duration: '2m', target: 10 },   // Morning opening
    { duration: '3m', target: 25 },   // Mid-morning traffic
    { duration: '5m', target: 40 },   // Peak morning traffic
    { duration: '10m', target: 50 },  // Lunch rush
    { duration: '8m', target: 60 },   // Afternoon peak
    { duration: '3m', target: 30 },   // Evening wind-down
    { duration: '2m', target: 0 }     // System shutdown
  ],
  
  // High concurrency stress test - extreme load
  HIGH_CONCURRENCY: [
    { duration: '1m', target: 20 },   // Initial load
    { duration: '2m', target: 50 },   // Moderate load
    { duration: '2m', target: 100 },  // High load
    { duration: '3m', target: 150 },  // Very high load
    { duration: '5m', target: 200 },  // Peak concurrent users
    { duration: '8m', target: 200 },  // Sustained peak load
    { duration: '2m', target: 100 },  // Recovery phase
    { duration: '1m', target: 0 }     // Ramp down
  ],
  
  // Connection persistence - long-running sessions
  PERSISTENCE: [
    { duration: '3m', target: 15 },   // Early users connect
    { duration: '5m', target: 30 },   // More users join
    { duration: '10m', target: 45 },  // Peak concurrent connections
    { duration: '15m', target: 60 },  // Sustained high connections
    { duration: '20m', target: 75 },  // Maximum persistent connections
    { duration: '10m', target: 60 },  // Some users disconnect
    { duration: '5m', target: 30 },   // Gradual decrease
    { duration: '2m', target: 0 }     // All users disconnect
  ]
};

// Common HTTP request options
export const HTTP_OPTIONS = {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': CONFIG.API_KEY
  },
  timeout: CONFIG.TIMEOUT
};

// Test thresholds for performance validation
export const PERFORMANCE_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
  http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
  http_reqs: ['rate>1'],             // Request rate should be above 1 RPS
  checks: ['rate>0.9']               // Check success rate should be above 90%
};

export default CONFIG;
