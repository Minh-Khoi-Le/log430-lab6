import http from 'k6/http';
import { check, group } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';

/**
 * Comprehensive test runner for all critical endpoints
 * This test covers the most frequently accessed endpoints in the system
 */

export const options = {
  stages: STAGES.LOAD,
  thresholds: PERFORMANCE_THRESHOLDS,
  tags: {
    service: 'all-services',
    endpoint: 'comprehensive'
  }
};

export default function() {
  // Authenticate once per VU
  const auth = loginTestUser(__VU % 5);
  if (!auth) {
    console.error('Authentication failed');
    return;
  }

  // Test different endpoint groups
  group('Authentication Endpoints', () => {
    testAuthEndpoints(auth.token);
  });

  group('Product Catalog Endpoints', () => {
    testProductEndpoints(auth.token);
  });

  group('Stock Management Endpoints', () => {
    testStockEndpoints(auth.token);
  });

  group('Sales Transaction Endpoints', () => {
    testSalesEndpoints(auth.token);
  });

  group('Store Management Endpoints', () => {
    testStoreEndpoints(auth.token);
  });

  group('Refund Processing Endpoints', () => {
    testRefundEndpoints(auth.token);
  });
}

/**
 * Test authentication endpoints
 */
function testAuthEndpoints(token) {
  // Test profile endpoint
  const profileResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.ME}`,
    addAuthHeader(token)
  );
  
  check(profileResponse, {
    'Auth - Profile check - Status is 200': (r) => r.status === 200,
    'Auth - Profile check - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('Auth - Profile Check', profileResponse, 200);
  thinkTime();
}

/**
 * Test product catalog endpoints
 */
function testProductEndpoints(token) {
  // Get all products (most frequent)
  const productsResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    addAuthHeader(token)
  );
  
  check(productsResponse, {
    'Products - Get all - Status is 200': (r) => r.status === 200,
    'Products - Get all - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Products - Get All', productsResponse, 200);
  thinkTime();
  
  // Search products
  const searchResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=laptop`,
    addAuthHeader(token)
  );
  
  check(searchResponse, {
    'Products - Search - Status is 200': (r) => r.status === 200,
    'Products - Search - Response time < 800ms': (r) => r.timings.duration < 800
  });
  
  logTestResult('Products - Search', searchResponse, 200);
  thinkTime();
  
  // Get specific product
  const productResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(1)}`,
    addAuthHeader(token)
  );
  
  check(productResponse, {
    'Products - Get by ID - Status is 200': (r) => r.status === 200,
    'Products - Get by ID - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('Products - Get by ID', productResponse, 200);
  thinkTime();
}

/**
 * Test stock management endpoints
 */
function testStockEndpoints(token) {
  // Get all stock
  const stockResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    addAuthHeader(token)
  );
  
  check(stockResponse, {
    'Stock - Get all - Status is 200': (r) => r.status === 200,
    'Stock - Get all - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Stock - Get All', stockResponse, 200);
  thinkTime();
  
  // Get stock by store
  const storeStockResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BY_STORE(1)}`,
    addAuthHeader(token)
  );
  
  check(storeStockResponse, {
    'Stock - Get by store - Status is 200': (r) => r.status === 200,
    'Stock - Get by store - Response time < 800ms': (r) => r.timings.duration < 800
  });
  
  logTestResult('Stock - Get by Store', storeStockResponse, 200);
  thinkTime();
  
  // Get low stock items
  const lowStockResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
    addAuthHeader(token)
  );
  
  check(lowStockResponse, {
    'Stock - Low stock - Status is 200': (r) => r.status === 200,
    'Stock - Low stock - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Stock - Low Stock', lowStockResponse, 200);
  thinkTime();
}

/**
 * Test sales transaction endpoints
 */
function testSalesEndpoints(token) {
  // Get all sales
  const salesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    addAuthHeader(token)
  );
  
  check(salesResponse, {
    'Sales - Get all - Status is 200': (r) => r.status === 200,
    'Sales - Get all - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Sales - Get All', salesResponse, 200);
  thinkTime();
  
  // Get sales by user
  const userSalesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_USER(1)}`,
    addAuthHeader(token)
  );
  
  check(userSalesResponse, {
    'Sales - Get by user - Status is 200': (r) => r.status === 200,
    'Sales - Get by user - Response time < 800ms': (r) => r.timings.duration < 800
  });
  
  logTestResult('Sales - Get by User', userSalesResponse, 200);
  thinkTime();
  
  // Get sales summary
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const summaryResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    addAuthHeader(token)
  );
  
  check(summaryResponse, {
    'Sales - Summary - Status is 200': (r) => r.status === 200,
    'Sales - Summary - Response time < 1.5s': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Sales - Summary', summaryResponse, 200);
  thinkTime();
}

/**
 * Test store management endpoints
 */
function testStoreEndpoints(token) {
  // Get all stores
  const storesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
    addAuthHeader(token)
  );
  
  check(storesResponse, {
    'Stores - Get all - Status is 200': (r) => r.status === 200,
    'Stores - Get all - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('Stores - Get All', storesResponse, 200);
  thinkTime();
  
  // Get specific store
  const storeResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BY_ID(1)}`,
    addAuthHeader(token)
  );
  
  check(storeResponse, {
    'Stores - Get by ID - Status is 200': (r) => r.status === 200,
    'Stores - Get by ID - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('Stores - Get by ID', storeResponse, 200);
  thinkTime();
}

/**
 * Test refund processing endpoints
 */
function testRefundEndpoints(token) {
  // Get all refunds
  const refundsResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BASE}`,
    addAuthHeader(token)
  );
  
  check(refundsResponse, {
    'Refunds - Get all - Status is 200': (r) => r.status === 200,
    'Refunds - Get all - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Refunds - Get All', refundsResponse, 200);
  thinkTime();
  
  // Get refunds by user
  const userRefundsResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BY_USER(1)}`,
    addAuthHeader(token)
  );
  
  check(userRefundsResponse, {
    'Refunds - Get by user - Status is 200': (r) => r.status === 200,
    'Refunds - Get by user - Response time < 800ms': (r) => r.timings.duration < 800
  });
  
  logTestResult('Refunds - Get by User', userRefundsResponse, 200);
  thinkTime();
}

export function setup() {
  console.log('Setting up comprehensive test runner...');
  console.log('This test will cover all critical endpoints across all microservices');
  
  // Verify system is ready
  const auth = loginTestUser();
  if (!auth) {
    console.error('System setup failed - authentication not working');
    return {};
  }
  
  console.log('System is ready for comprehensive testing');
  return {};
}

export function teardown() {
  console.log('Comprehensive test run completed');
  console.log('Check the results for performance across all services');
}
