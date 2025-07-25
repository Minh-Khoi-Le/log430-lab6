import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomInt } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';

export const options = {
  stages: STAGES.LOAD,
  thresholds: PERFORMANCE_THRESHOLDS,
  tags: {
    service: 'catalog-service',
    endpoint: 'stock'
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
  
  // Test stock listing (frequently accessed)
  testGetAllStock();
  thinkTime();
  
  // Test stock by store (common query)
  testGetStockByStore();
  thinkTime();
  
  // Test stock by product (common query)
  testGetStockByProduct();
  thinkTime();
  
  // Test low stock items (management dashboard)
  testGetLowStockItems();
  thinkTime();
  
  // Test stock update (less frequent, but critical)
  testUpdateStock();
  thinkTime();
}

/**
 * Test getting all stock items
 */
function testGetAllStock() {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
    addAuthHeader(authToken)
  );
  
  const isValid = check(response, {
    'Get all stock - Status is 200': (r) => r.status === 200,
    'Get all stock - Response time < 1s': (r) => r.timings.duration < 1000,
    'Get all stock - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    },
    'Get all stock - Response contains stock data': (r) => {
      try {
        const data = JSON.parse(r.body);
        const stocks = Array.isArray(data) ? data : data.data;
        return stocks && stocks.length >= 0;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get All Stock', response, 200);
  
  // Store stock ID for later use
  if (isValid) {
    try {
      const data = JSON.parse(response.body);
      const stocks = Array.isArray(data) ? data : data.data;
      if (stocks && stocks.length > 0) {
        global.stockId = stocks[0].id;
        global.storeId = stocks[0].storeId;
        global.productId = stocks[0].productId;
      }
    } catch (e) {
      console.error('Failed to parse stock response');
    }
  }
}

/**
 * Test getting stock by store
 */
function testGetStockByStore() {
  const storeId = global.storeId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BY_STORE(storeId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get stock by store - Status is 200': (r) => r.status === 200,
    'Get stock by store - Response time < 800ms': (r) => r.timings.duration < 800,
    'Get stock by store - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Stock by Store', response, 200);
}

/**
 * Test getting stock by product
 */
function testGetStockByProduct() {
  const productId = global.productId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BY_PRODUCT(productId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get stock by product - Status is 200': (r) => r.status === 200,
    'Get stock by product - Response time < 800ms': (r) => r.timings.duration < 800,
    'Get stock by product - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Stock by Product', response, 200);
}

/**
 * Test getting low stock items
 */
function testGetLowStockItems() {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get low stock items - Status is 200': (r) => r.status === 200,
    'Get low stock items - Response time < 1s': (r) => r.timings.duration < 1000,
    'Get low stock items - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Low Stock Items', response, 200);
}

/**
 * Test updating stock
 */
function testUpdateStock() {
  const stockId = global.stockId || 1;
  const updatedStock = {
    quantity: getRandomInt(10, 100),
    minQuantity: 5
  };
  
  const response = http.put(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BY_ID(stockId)}`,
    JSON.stringify(updatedStock),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Update stock - Status is 200': (r) => r.status === 200,
    'Update stock - Response time < 1s': (r) => r.timings.duration < 1000,
    'Update stock - Response contains updated data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.quantity === updatedStock.quantity;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Update Stock', response, 200);
}

/**
 * Test stock reservation (critical for sales)
 */
function testReserveStock() {
  const reservationData = {
    storeId: global.storeId || 1,
    productId: global.productId || 1,
    quantity: getRandomInt(1, 5)
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.RESERVE}`,
    JSON.stringify(reservationData),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Reserve stock - Status is 200': (r) => r.status === 200,
    'Reserve stock - Response time < 1s': (r) => r.timings.duration < 1000,
    'Reserve stock - Response contains reservation data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.reserved === true || data.success === true;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Reserve Stock', response, 200);
}

/**
 * Test stock adjustment (management operation)
 */
function testAdjustStock() {
  const adjustmentData = {
    storeId: global.storeId || 1,
    productId: global.productId || 1,
    quantity: getRandomInt(-10, 10),
    reason: 'Load test adjustment'
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.ADJUST}`,
    JSON.stringify(adjustmentData),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Adjust stock - Status is 200': (r) => r.status === 200,
    'Adjust stock - Response time < 1s': (r) => r.timings.duration < 1000,
    'Adjust stock - Response contains adjustment data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.adjusted === true || data.success === true;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Adjust Stock', response, 200);
}

export function setup() {
  console.log('Setting up stock management tests...');
  
  // Ensure we can authenticate
  const auth = loginTestUser();
  if (!auth) {
    console.error('Failed to authenticate for setup');
    return {};
  }
  
  console.log('Stock management tests setup complete');
  return {
    authToken: auth.token
  };
}

export function teardown() {
  console.log('Stock management tests completed');
}
