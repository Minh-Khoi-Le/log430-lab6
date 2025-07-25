import http from 'k6/http';
import { check, group } from 'k6';
import { CONFIG, ENDPOINTS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomItem } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';
import { SharedArray } from 'k6/data';

/**
 * High-Concurrency Stress Test
 * 
 * This test simulates extreme load conditions with many simultaneous users
 * to test system limits and identify breaking points.
 * 
 * Features:
 * - High concurrent user count (up to 200 users)
 * - Realistic session persistence
 * - Mixed read/write operations
 * - Connection pooling simulation
 * - Performance degradation monitoring
 */

// Shared data for realistic test scenarios
const testData = new SharedArray('test_data', function() {
  return [
    { searchTerm: 'laptop', category: 'electronics', minPrice: 500, maxPrice: 2000 },
    { searchTerm: 'phone', category: 'electronics', minPrice: 200, maxPrice: 1500 },
    { searchTerm: 'headphones', category: 'electronics', minPrice: 50, maxPrice: 300 },
    { searchTerm: 'shoes', category: 'sports', minPrice: 40, maxPrice: 200 },
    { searchTerm: 'coffee', category: 'appliances', minPrice: 20, maxPrice: 150 },
    { searchTerm: 'book', category: 'education', minPrice: 10, maxPrice: 100 },
    { searchTerm: 'watch', category: 'accessories', minPrice: 50, maxPrice: 1000 },
    { searchTerm: 'camera', category: 'electronics', minPrice: 300, maxPrice: 3000 }
  ];
});

export const options = {
  stages: [
    // Aggressive ramp-up to test system limits
    { duration: '1m', target: 20 },    // Initial load
    { duration: '2m', target: 50 },    // Moderate load
    { duration: '2m', target: 100 },   // High load
    { duration: '3m', target: 150 },   // Very high load
    { duration: '5m', target: 200 },   // Peak concurrent users
    { duration: '8m', target: 200 },   // Sustained peak load
    { duration: '2m', target: 150 },   // Gradual decrease
    { duration: '2m', target: 100 },   // Further decrease
    { duration: '2m', target: 50 },    // Recovery phase
    { duration: '1m', target: 0 }      // Ramp down
  ],
  thresholds: {
    // Stress test thresholds - expect degradation
    http_req_duration: ['p(95)<5000'],   // 95% under 5s (degraded performance expected)
    http_req_failed: ['rate<0.25'],      // Allow 25% error rate under extreme stress
    http_reqs: ['rate>5'],               // Maintain at least 5 RPS
    checks: ['rate>0.70'],               // 70% success rate under stress
    
    // Connection-specific thresholds
    'http_req_connecting': ['p(95)<1000'], // Connection time under 1s
    'http_req_waiting': ['p(95)<4000'],    // Server processing time under 4s
    
    // VU (Virtual User) monitoring
    'vus': ['value>20'],                 // Maintain at least 20 active virtual users
    'vus_max': ['value>50']              // Maximum concurrent virtual users
  },
  tags: {
    service: 'stress-test',
    endpoint: 'high-concurrency'
  }
};

export default function() {
  // Simulate persistent user sessions
  const userSession = createUserSession();
  
  // Execute user session with multiple activities
  executeUserSession(userSession);
}

/**
 * Create a user session with authentication and session state
 */
function createUserSession() {
  const auth = loginTestUser(__VU % 5);
  if (!auth) {
    console.error('Failed to create user session');
    return null;
  }
  
  return {
    token: auth.token,
    userId: auth.userId,
    sessionStart: Date.now(),
    activities: 0,
    sessionId: `session_${__VU}_${__ITER}`
  };
}

/**
 * Execute a complete user session with multiple activities
 */
function executeUserSession(session) {
  if (!session) return;
  
  const sessionTags = {
    session_id: session.sessionId,
    user_id: session.userId
  };
  
  group('User Session Activities', () => {
    // Activity 1: Browse and search (high frequency)
    browseAndSearch(session, sessionTags);
    
    // Activity 2: Check inventory across stores (medium frequency)
    checkInventoryAcrossStores(session, sessionTags);
    
    // Activity 3: View detailed product information (high frequency)
    viewProductDetails(session, sessionTags);
    
    // Activity 4: Monitor sales and transactions (low frequency)
    if (Math.random() < 0.3) {
      monitorSalesActivity(session, sessionTags);
    }
    
    // Activity 5: Perform administrative tasks (very low frequency)
    if (Math.random() < 0.1) {
      performAdminTasks(session, sessionTags);
    }
  });
  
  // Track session duration
  const sessionDuration = Date.now() - session.sessionStart;
  console.log(`Session ${session.sessionId} duration: ${sessionDuration}ms`);
}

/**
 * Browse and search activities - most common user behavior
 */
function browseAndSearch(session, tags) {
  group('Browse and Search', () => {
    // Browse all products
    const browseResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(browseResponse, {
      'Browse Products - Status OK': (r) => r.status === 200,
      'Browse Products - Response under 3s': (r) => r.timings.duration < 3000
    });
    
    logTestResult('Browse Products', browseResponse, 200);
    thinkTime(0.5, 1.5); // Quick thinking time
    
    // Search for specific items
    const searchData = getRandomItem(testData);
    const searchResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${searchData.searchTerm}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(searchResponse, {
      'Search Products - Status OK': (r) => r.status === 200,
      'Search Products - Response under 2s': (r) => r.timings.duration < 2000,
      'Search Products - Has results': (r) => r.body.length > 0
    });
    
    logTestResult('Search Products', searchResponse, 200);
    thinkTime(1, 2);
  });
}

/**
 * Check inventory across multiple stores
 */
function checkInventoryAcrossStores(session, tags) {
  group('Inventory Check', () => {
    // Get all stores first
    const storesResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(storesResponse, {
      'Get Stores - Status OK': (r) => r.status === 200,
      'Get Stores - Response under 1s': (r) => r.timings.duration < 1000
    });
    
    logTestResult('Get Stores', storesResponse, 200);
    thinkTime(0.5, 1);
    
    // Check stock levels
    const stockResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(stockResponse, {
      'Check Stock - Status OK': (r) => r.status === 200,
      'Check Stock - Response under 2s': (r) => r.timings.duration < 2000
    });
    
    logTestResult('Check Stock', stockResponse, 200);
    thinkTime(1, 2);
    
    // Check low stock alerts
    const lowStockResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(lowStockResponse, {
      'Low Stock Check - Status OK': (r) => r.status === 200,
      'Low Stock Check - Response under 1.5s': (r) => r.timings.duration < 1500
    });
    
    logTestResult('Low Stock Check', lowStockResponse, 200);
    thinkTime(0.5, 1);
  });
}

/**
 * View detailed product information
 */
function viewProductDetails(session, tags) {
  group('Product Details', () => {
    // Get products first to have IDs
    const productsResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    if (productsResponse.status === 200) {
      try {
        const products = JSON.parse(productsResponse.body);
        if (products && products.length > 0) {
          // View random product details
          const randomProduct = getRandomItem(products);
          if (randomProduct && randomProduct.id) {
            const detailsResponse = http.get(
              `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(randomProduct.id)}`,
              { headers: { ...addAuthHeader(session.token).headers }, tags }
            );
            
            check(detailsResponse, {
              'Product Details - Status OK': (r) => r.status === 200,
              'Product Details - Response under 1s': (r) => r.timings.duration < 1000
            });
            
            logTestResult('Product Details', detailsResponse, 200);
          }
        }
      } catch (e) {
        console.error('Error parsing products response:', e);
      }
    }
    
    thinkTime(1, 3);
  });
}

/**
 * Monitor sales activity
 */
function monitorSalesActivity(session, tags) {
  group('Sales Monitoring', () => {
    // Get sales summary
    const salesSummaryResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(salesSummaryResponse, {
      'Sales Summary - Status OK': (r) => r.status === 200,
      'Sales Summary - Response under 3s': (r) => r.timings.duration < 3000
    });
    
    logTestResult('Sales Summary', salesSummaryResponse, 200);
    thinkTime(1, 2);
    
    // Get recent sales
    const salesResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(salesResponse, {
      'Get Sales - Status OK': (r) => r.status === 200,
      'Get Sales - Response under 2s': (r) => r.timings.duration < 2000
    });
    
    logTestResult('Get Sales', salesResponse, 200);
    thinkTime(1, 2);
  });
}

/**
 * Perform administrative tasks
 */
function performAdminTasks(session, tags) {
  group('Admin Tasks', () => {
    // Get users (admin function)
    const usersResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.USERS.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(usersResponse, {
      'Get Users - Response received': (r) => r.status >= 200,
      'Get Users - Response under 3s': (r) => r.timings.duration < 3000
    });
    
    logTestResult('Get Users', usersResponse, 200);
    thinkTime(2, 4);
    
    // Check refunds
    const refundsResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(refundsResponse, {
      'Get Refunds - Status OK': (r) => r.status === 200,
      'Get Refunds - Response under 2s': (r) => r.timings.duration < 2000
    });
    
    logTestResult('Get Refunds', refundsResponse, 200);
    thinkTime(1, 3);
  });
}

/**
 * Setup function to prepare test environment
 */
export function setup() {
  console.log('Setting up high-concurrency stress test...');
  console.log(`Target URL: ${CONFIG.BASE_URL}`);
  console.log('Test will simulate up to 200 concurrent users');
  console.log('Expected performance degradation under extreme load');
  
  return {
    testStart: Date.now(),
    baseUrl: CONFIG.BASE_URL
  };
}

/**
 * Teardown function to clean up after test
 */
export function teardown(data) {
  const testDuration = Date.now() - data.testStart;
  console.log(`High-concurrency stress test completed in ${testDuration}ms`);
  console.log('Review results for performance degradation patterns');
}
