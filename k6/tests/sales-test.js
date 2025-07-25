import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomInt } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';

export const options = {
  stages: STAGES.LOAD,
  thresholds: PERFORMANCE_THRESHOLDS,
  tags: {
    service: 'transaction-service',
    endpoint: 'sales'
  }
};

let authToken = null;

export default function() {
  // Authenticate if needed
  if (!authToken) {
    const auth = loginTestUser();
    if (auth) {
      authToken = auth.token;
    } else {
      console.error('Failed to authenticate');
      return;
    }
  }
  
  // Test sales listing
  testGetAllSales();
  thinkTime();
  
  // Test sales by user (common query)
  testGetSalesByUser();
  thinkTime();
  
  // Test sales by store (management view)
  testGetSalesByStore();
  thinkTime();
  
  // Test sales summary (dashboard)
  testGetSalesSummary();
  thinkTime();
  
  // Test creating a sale (critical operation)
  testCreateSale();
  thinkTime();
}

/**
 * Test getting all sales
 */
function testGetAllSales() {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    addAuthHeader(authToken)
  );
  
  const isValid = check(response, {
    'Get all sales - Status is 200': (r) => r.status === 200,
    'Get all sales - Response time < 1s': (r) => r.timings.duration < 1000,
    'Get all sales - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get All Sales', response, 200);
  
  // Store sale ID for later use
  if (isValid) {
    try {
      const data = JSON.parse(response.body);
      const sales = Array.isArray(data) ? data : data.data;
      if (sales && sales.length > 0) {
        global.saleId = sales[0].id;
        global.userId = sales[0].userId;
        global.storeId = sales[0].storeId;
      }
    } catch (e) {
      console.error('Failed to parse sales response');
    }
  }
}

/**
 * Test getting sales by user
 */
function testGetSalesByUser() {
  const userId = global.userId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_USER(userId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get sales by user - Status is 200': (r) => r.status === 200,
    'Get sales by user - Response time < 800ms': (r) => r.timings.duration < 800,
    'Get sales by user - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Sales by User', response, 200);
}

/**
 * Test getting sales by store
 */
function testGetSalesByStore() {
  const storeId = global.storeId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_STORE(storeId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get sales by store - Status is 200': (r) => r.status === 200,
    'Get sales by store - Response time < 800ms': (r) => r.timings.duration < 800,
    'Get sales by store - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Sales by Store', response, 200);
}

/**
 * Test getting sales summary
 */
function testGetSalesSummary() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // Last month
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.SUMMARY}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get sales summary - Status is 200': (r) => r.status === 200,
    'Get sales summary - Response time < 1s': (r) => r.timings.duration < 1000,
    'Get sales summary - Response contains summary data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.totalSales !== undefined || data.total !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Sales Summary', response, 200);
}

/**
 * Test creating a sale
 */
function testCreateSale() {
  const saleData = {
    userId: global.userId || 1,
    storeId: global.storeId || 1,
    items: [
      {
        productId: 1,
        quantity: getRandomInt(1, 3),
        price: 99.99
      },
      {
        productId: 2,
        quantity: getRandomInt(1, 2),
        price: 149.99
      }
    ],
    total: 249.98,
    paymentMethod: 'credit_card',
    status: 'completed'
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
    JSON.stringify(saleData),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Create sale - Status is 201': (r) => r.status === 201,
    'Create sale - Response time < 1.5s': (r) => r.timings.duration < 1500,
    'Create sale - Response contains sale data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.total === saleData.total;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Create Sale', response, 201);
}

/**
 * Test getting a specific sale
 */
function testGetSale() {
  const saleId = global.saleId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BY_ID(saleId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get sale - Status is 200': (r) => r.status === 200,
    'Get sale - Response time < 500ms': (r) => r.timings.duration < 500,
    'Get sale - Response contains sale data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.total;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Sale', response, 200);
}

/**
 * Test updating sale status
 */
function testUpdateSaleStatus() {
  const saleId = global.saleId || 1;
  const statusData = {
    status: 'refunded'
  };
  
  const response = http.put(
    `${CONFIG.BASE_URL}${ENDPOINTS.SALES.UPDATE_STATUS(saleId)}`,
    JSON.stringify(statusData),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Update sale status - Status is 200': (r) => r.status === 200,
    'Update sale status - Response time < 1s': (r) => r.timings.duration < 1000,
    'Update sale status - Response contains updated data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.status === statusData.status;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Update Sale Status', response, 200);
}

export function setup() {
  console.log('Setting up sales transaction tests...');
  
  // Ensure we can authenticate
  const auth = loginTestUser();
  if (!auth) {
    console.error('Failed to authenticate for setup');
    return {};
  }
  
  console.log('Sales transaction tests setup complete');
  return {
    authToken: auth.token
  };
}

export function teardown() {
  console.log('Sales transaction tests completed');
}
