import http from 'k6/http';
import { check } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { thinkTime, generateFakeProduct, logTestResult, addAuthHeader } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';

export const options = {
  stages: STAGES.LOAD,
  thresholds: PERFORMANCE_THRESHOLDS,
  tags: {
    service: 'catalog-service',
    endpoint: 'products'
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
  
  // Test product listing (most common operation)
  testGetProducts();
  thinkTime();
  
  // Test product search (frequently used)
  testSearchProducts();
  thinkTime();
  
  // Test get specific product
  testGetProduct();
  thinkTime();
  
  // Test product creation (less frequent, admin operation)
  testCreateProduct();
  thinkTime();
}

/**
 * Test getting all products - most frequently accessed endpoint
 */
function testGetProducts() {
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    addAuthHeader(authToken)
  );
  
  const isValid = check(response, {
    'Get products - Status is 200': (r) => r.status === 200,
    'Get products - Response time < 1s': (r) => r.timings.duration < 1000,
    'Get products - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    },
    'Get products - Response not empty': (r) => {
      try {
        const data = JSON.parse(r.body);
        const products = Array.isArray(data) ? data : data.data;
        return products && products.length > 0;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Products', response, 200);
  
  // Store a product ID for later use
  if (isValid) {
    try {
      const data = JSON.parse(response.body);
      const products = Array.isArray(data) ? data : data.data;
      if (products && products.length > 0) {
        global.productId = products[0].id;
      }
    } catch (e) {
      console.error('Failed to parse products response');
    }
  }
}

/**
 * Test product search functionality
 */
function testSearchProducts() {
  const searchTerms = ['laptop', 'phone', 'headphones', 'coffee', 'shoes'];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${searchTerm}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Search products - Status is 200': (r) => r.status === 200,
    'Search products - Response time < 800ms': (r) => r.timings.duration < 800,
    'Search products - Response is JSON array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data) || (data.data && Array.isArray(data.data));
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Search Products', response, 200);
}

/**
 * Test getting a specific product
 */
function testGetProduct() {
  // Use stored product ID or default to 1
  const productId = global.productId || 1;
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(productId)}`,
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Get product - Status is 200': (r) => r.status === 200,
    'Get product - Response time < 500ms': (r) => r.timings.duration < 500,
    'Get product - Response contains product data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.name && data.price;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Get Product', response, 200);
}

/**
 * Test creating a new product (admin operation)
 */
function testCreateProduct() {
  const newProduct = generateFakeProduct();
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    JSON.stringify(newProduct),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Create product - Status is 201': (r) => r.status === 201,
    'Create product - Response time < 1s': (r) => r.timings.duration < 1000,
    'Create product - Response contains created product': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.id && data.name === newProduct.name;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Create Product', response, 201);
}

/**
 * Test updating a product
 */
function testUpdateProduct() {
  const productId = global.productId || 1;
  const updatedProduct = {
    name: 'Updated Product Name',
    price: 99.99,
    category: 'Updated Category'
  };
  
  const response = http.put(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BY_ID(productId)}`,
    JSON.stringify(updatedProduct),
    addAuthHeader(authToken)
  );
  
  check(response, {
    'Update product - Status is 200': (r) => r.status === 200,
    'Update product - Response time < 1s': (r) => r.timings.duration < 1000,
    'Update product - Response contains updated data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.name === updatedProduct.name;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Update Product', response, 200);
}

export function setup() {
  console.log('Setting up product catalog tests...');
  
  // Ensure we can authenticate
  const auth = loginTestUser();
  if (!auth) {
    console.error('Failed to authenticate for setup');
    return {};
  }
  
  console.log('Product catalog tests setup complete');
  return {
    authToken: auth.token
  };
}

export function teardown() {
  console.log('Product catalog tests completed');
}
