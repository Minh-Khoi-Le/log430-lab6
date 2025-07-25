import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomInt } from '../utils/helpers.js';
import { loginClient, loginManager } from '../utils/auth.js';

export const options = {
  stages: STAGES.STRESS,
  thresholds: {
    ...PERFORMANCE_THRESHOLDS,
    // E2E scenarios can be slower
    http_req_duration: ['p(95)<3000'],
    // Allow slightly higher error rate for complex scenarios
    http_req_failed: ['rate<0.15']
  },
  tags: {
    service: 'end-to-end',
    endpoint: 'user-journey'
  }
};

export default function() {
  // Randomly choose between customer and manager scenarios
  const scenario = Math.random() < 0.7 ? 'customer' : 'manager';
  
  if (scenario === 'customer') {
    customerShoppingJourney();
  } else {
    managerDashboardJourney();
  }
}

/**
 * Customer shopping journey scenario
 */
function customerShoppingJourney() {
  // Step 1: Customer login
  const auth = loginClient();
  if (!auth) {
    console.error('Customer login failed');
    return;
  }
  
  thinkTime();
  
  // Step 2: Browse products
  const products = browseProducts(auth.token);
  thinkTime();
  
  // Step 3: Search for specific product
  searchProducts(auth.token);
  thinkTime();
  
  // Step 4: Check store locations
  checkStoreLocations(auth.token);
  thinkTime();
  
  // Step 5: View specific product details
  if (products && products.length > 0) {
    viewProductDetails(auth.token, products[0].id);
    thinkTime();
  }
  
  // Step 6: Check stock availability
  checkStockAvailability(auth.token);
  thinkTime();
  
  // Step 7: Make a purchase
  makePurchase(auth.token);
  thinkTime();
  
  // Step 8: View purchase history
  viewPurchaseHistory(auth.token, auth.user.id);
  thinkTime();
}

/**
 * Manager dashboard journey scenario
 */
function managerDashboardJourney() {
  // Step 1: Manager login
  const auth = loginManager();
  if (!auth) {
    console.error('Manager login failed');
    return;
  }
  
  thinkTime();
  
  // Step 2: Check dashboard metrics
  checkDashboardMetrics(auth.token);
  thinkTime();
  
  // Step 3: Review sales data
  reviewSalesData(auth.token);
  thinkTime();
  
  // Step 4: Check inventory levels
  checkInventoryLevels(auth.token);
  thinkTime();
  
  // Step 5: Review low stock items
  reviewLowStockItems(auth.token);
  thinkTime();
  
  // Step 6: Update stock levels
  updateStockLevels(auth.token);
  thinkTime();
  
  // Step 7: Review refunds
  reviewRefunds(auth.token);
  thinkTime();
}

/**
 * Browse products
 */
function browseProducts(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Browse products - Status is 200': (r) => r.status === 200,
    'Browse products - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Browse Products', response, 200);
  
  try {
    const data = JSON.parse(response.body);
    return Array.isArray(data) ? data : data.data;
  } catch (e) {
    return [];
  }
}

/**
 * Search for products
 */
function searchProducts(token) {
  const searchTerms = ['laptop', 'phone', 'headphones', 'coffee'];
  const term = searchTerms[getRandomInt(0, searchTerms.length - 1)];
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${term}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Search products - Status is 200': (r) => r.status === 200,
    'Search products - Response time < 800ms': (r) => r.timings.duration < 800
  });
  
  logTestResult('Search Products', response, 200);
}

/**
 * Check store locations
 */
function checkStoreLocations(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Check stores - Status is 200': (r) => r.status === 200,
    'Check stores - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('Check Store Locations', response, 200);
}

/**
 * View product details
 */
function viewProductDetails(token, productId) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(productId)}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'View product details - Status is 200': (r) => r.status === 200,
    'View product details - Response time < 500ms': (r) => r.timings.duration < 500
  });
  
  logTestResult('View Product Details', response, 200);
}

/**
 * Check stock availability
 */
function checkStockAvailability(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Check stock - Status is 200': (r) => r.status === 200,
    'Check stock - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Check Stock Availability', response, 200);
}

/**
 * Make a purchase
 */
function makePurchase(token) {
  const saleData = {
    userId: 1,
    storeId: 1,
    items: [
      {
        productId: 1,
        quantity: 1,
        price: 99.99
      }
    ],
    total: 99.99,
    paymentMethod: 'credit_card',
    status: 'completed'
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    JSON.stringify(saleData),
    addAuthHeader(token)
  );
  
  check(response, {
    'Make purchase - Status is 201': (r) => r.status === 201,
    'Make purchase - Response time < 2s': (r) => r.timings.duration < 2000
  });
  
  logTestResult('Make Purchase', response, 201);
}

/**
 * View purchase history
 */
function viewPurchaseHistory(token, userId) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_USER(userId)}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'View purchase history - Status is 200': (r) => r.status === 200,
    'View purchase history - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('View Purchase History', response, 200);
}

/**
 * Check dashboard metrics
 */
function checkDashboardMetrics(token) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Check dashboard metrics - Status is 200': (r) => r.status === 200,
    'Check dashboard metrics - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Check Dashboard Metrics', response, 200);
}

/**
 * Review sales data
 */
function reviewSalesData(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Review sales data - Status is 200': (r) => r.status === 200,
    'Review sales data - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Review Sales Data', response, 200);
}

/**
 * Check inventory levels
 */
function checkInventoryLevels(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Check inventory levels - Status is 200': (r) => r.status === 200,
    'Check inventory levels - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Check Inventory Levels', response, 200);
}

/**
 * Review low stock items
 */
function reviewLowStockItems(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Review low stock - Status is 200': (r) => r.status === 200,
    'Review low stock - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Review Low Stock Items', response, 200);
}

/**
 * Update stock levels
 */
function updateStockLevels(token) {
  const updateData = {
    quantity: getRandomInt(50, 200),
    minQuantity: 10
  };
  
  const response = http.put(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BY_ID(1)}`,
    JSON.stringify(updateData),
    addAuthHeader(token)
  );
  
  check(response, {
    'Update stock levels - Status is 200': (r) => r.status === 200,
    'Update stock levels - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Update Stock Levels', response, 200);
}

/**
 * Review refunds
 */
function reviewRefunds(token) {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.REFUNDS.BASE}`,
    addAuthHeader(token)
  );
  
  check(response, {
    'Review refunds - Status is 200': (r) => r.status === 200,
    'Review refunds - Response time < 1s': (r) => r.timings.duration < 1000
  });
  
  logTestResult('Review Refunds', response, 200);
}

export function setup() {
  console.log('Setting up end-to-end scenario tests...');
  console.log('This will simulate real user journeys including shopping and management tasks');
  return {};
}

export function teardown() {
  console.log('End-to-end scenario tests completed');
}
