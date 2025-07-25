import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomItem } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';

export const options = {
  stages: STAGES.SPIKE,
  thresholds: {
    // Spike tests should handle sudden load increases
    http_req_duration: ['p(95)<5000'], // Allow up to 5s during spike
    http_req_failed: ['rate<0.2'],     // Allow 20% error rate during spike
    http_reqs: ['rate>0.5']            // Maintain at least 0.5 RPS
  },
  tags: {
    service: 'all-services',
    endpoint: 'spike-test'
  }
};

export default function() {
  // Get auth token
  const auth = loginTestUser(__VU % 5); // Distribute across 5 test users
  if (!auth) {
    console.error('Authentication failed');
    return;
  }
  
  // Simulate high-traffic scenarios with different user behaviors
  const scenario = getRandomItem([
    'browse_products',
    'search_products', 
    'check_stock',
    'view_sales',
    'dashboard_check'
  ]);
  
  switch (scenario) {
    case 'browse_products':
      browseProductsScenario(auth.token);
      break;
    case 'search_products':
      searchProductsScenario(auth.token);
      break;
    case 'check_stock':
      checkStockScenario(auth.token);
      break;
    case 'view_sales':
      viewSalesScenario(auth.token);
      break;
    case 'dashboard_check':
      dashboardCheckScenario(auth.token);
      break;
  }
}

/**
 * Browse products scenario - most common user action
 */
function browseProductsScenario(token) {
  // Get all products
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Spike - Browse products - Status is 200': (r) => r.status === 200,
    'Spike - Browse products - Response time < 3s': (r) => r.timings.duration < 3000
  });
  
  logTestResult('Spike - Browse Products', response, 200);
  
  // Small think time to simulate user browsing
  thinkTime();
  
  // View a specific product
  if (response.status === 200) {
    const productResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(1)}`,
      addAuthHeader(token)
    );
    
    check(productResponse, {
      'Spike - View product - Status is 200': (r) => r.status === 200,
      'Spike - View product - Response time < 2s': (r) => r.timings.duration < 2000
    });
    
    logTestResult('Spike - View Product', productResponse, 200);
  }
}

/**
 * Search products scenario - high CPU usage
 */
function searchProductsScenario(token) {
  const searchTerms = ['laptop', 'phone', 'headphones', 'coffee', 'shoes', 'book', 'watch'];
  const term = getRandomItem(searchTerms);
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${term}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Spike - Search products - Status is 200': (r) => r.status === 200,
    'Spike - Search products - Response time < 2s': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Spike - Search Products', response, 200);
}

/**
 * Check stock scenario - database intensive
 */
function checkStockScenario(token) {
  // Get all stock
  const stockResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    addAuthHeader(token)
  );
  
  check(stockResponse, {
    'Spike - Check stock - Status is 200': (r) => r.status === 200,
    'Spike - Check stock - Response time < 3s': (r) => r.timings.duration < 3000
  });
  
  logTestResult('Spike - Check Stock', stockResponse, 200);
  
  // Check low stock items
  const lowStockResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
    addAuthHeader(token)
  );
  
  check(lowStockResponse, {
    'Spike - Low stock - Status is 200': (r) => r.status === 200,
    'Spike - Low stock - Response time < 2s': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Spike - Low Stock', lowStockResponse, 200);
}

/**
 * View sales scenario - transaction service load
 */
function viewSalesScenario(token) {
  // Get all sales
  const salesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    addAuthHeader(token)
  );
  
  check(salesResponse, {
    'Spike - View sales - Status is 200': (r) => r.status === 200,
    'Spike - View sales - Response time < 2s': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Spike - View Sales', salesResponse, 200);
  
  // Get sales by user
  const userSalesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_USER(1)}`,
    addAuthHeader(token)
  );
  
  check(userSalesResponse, {
    'Spike - User sales - Status is 200': (r) => r.status === 200,
    'Spike - User sales - Response time < 1.5s': (r) => r.timings.duration < 1500
  });
  
  logTestResult('Spike - User Sales', userSalesResponse, 200);
}

/**
 * Dashboard check scenario - multiple service calls
 */
function dashboardCheckScenario(token) {
  // Get sales summary
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Last week
  
  const summaryResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    addAuthHeader(token)
  );
  
  check(summaryResponse, {
    'Spike - Sales summary - Status is 200': (r) => r.status === 200,
    'Spike - Sales summary - Response time < 3s': (r) => r.timings.duration < 3000
  });
  
  logTestResult('Spike - Sales Summary', summaryResponse, 200);
  
  // Get stores
  const storesResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
    addAuthHeader(token)
  );
  
  check(storesResponse, {
    'Spike - Get stores - Status is 200': (r) => r.status === 200,
    'Spike - Get stores - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Spike - Get Stores', storesResponse, 200);
  
  // Get refunds
  const refundsResponse = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BASE}`,
    addAuthHeader(token)
  );
  
  check(refundsResponse, {
    'Spike - Get refunds - Status is 200': (r) => r.status === 200,
    'Spike - Get refunds - Response time < 2s': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Spike - Get Refunds', refundsResponse, 200);
}

/**
 * Concurrent operations scenario - stress multiple services
 */
function concurrentOperationsScenario(token) {
  const batch = http.batch([
    {
      method: 'GET',
      url: `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
      headers: addAuthHeader(token).headers
    },
    {
      method: 'GET',
      url: `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
      headers: addAuthHeader(token).headers
    },
    {
      method: 'GET',
      url: `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
      headers: addAuthHeader(token).headers
    },
    {
      method: 'GET',
      url: `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
      headers: addAuthHeader(token).headers
    }
  ]);
  
  batch.forEach((response, index) => {
    const endpoints = ['Products', 'Stock', 'Sales', 'Stores'];
    check(response, {
      [`Spike - Concurrent ${endpoints[index]} - Status is 200`]: (r) => r.status === 200,
      [`Spike - Concurrent ${endpoints[index]} - Response time < 4s`]: (r) => r.timings.duration < 4000
    });
    
    logTestResult(`Spike - Concurrent ${endpoints[index]}`, response, 200);
  });
}

export function setup() {
  console.log('Setting up spike test...');
  console.log('This test simulates sudden increases in traffic to test system resilience');
  
  // Pre-warm the system
  const auth = loginTestUser();
  if (auth) {
    console.log('System pre-warming completed');
  }
  
  return {};
}

export function teardown() {
  console.log('Spike test completed');
  console.log('Check if the system maintained acceptable performance during traffic spikes');
}
