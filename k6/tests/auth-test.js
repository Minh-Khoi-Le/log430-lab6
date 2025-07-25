import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, ENDPOINTS, STAGES, PERFORMANCE_THRESHOLDS } from '../config/config.js';
import { validateJsonResponse, thinkTime, generateFakeUser, logTestResult } from '../utils/helpers.js';
import { authenticate, register, loginTestUser, validateAuth } from '../utils/auth.js';

export const options = {
  stages: STAGES.LOAD,
  thresholds: PERFORMANCE_THRESHOLDS,
  tags: {
    service: 'user-service',
    endpoint: 'authentication'
  }
};

export default function() {
  // Test user login
  testUserLogin();
  thinkTime();
  
  // Test user registration
  testUserRegistration();
  thinkTime();
  
  // Test auth validation
  testAuthValidation();
  thinkTime();
}

/**
 * Test user login functionality
 */
function testUserLogin() {
  const testUser = CONFIG.TEST_DATA.USERS[0]; // Use first test user
  
  const loginData = {
    name: testUser.name,
    password: testUser.password
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.LOGIN}`,
    JSON.stringify(loginData),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY
      }
    }
  );
  
  const isValid = check(response, {
    'Login - Status is 200': (r) => r.status === 200,
    'Login - Response time < 1s': (r) => r.timings.duration < 1000,
    'Login - Response contains token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.token && data.token.length > 0;
      } catch (e) {
        return false;
      }
    },
    'Login - Response contains user data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.user && data.user.name === testUser.name;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('User Login', response, 200);
  
  if (isValid) {
    // Store token for subsequent requests
    const responseData = JSON.parse(response.body);
    global.authToken = responseData.token;
  }
}

/**
 * Test user registration functionality
 */
function testUserRegistration() {
  const newUser = generateFakeUser();
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.REGISTER}`,
    JSON.stringify(newUser),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY
      }
    }
  );
  
  const isValid = check(response, {
    'Register - Status is 201': (r) => r.status === 201,
    'Register - Response time < 1s': (r) => r.timings.duration < 1000,
    'Register - Response contains token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.token && data.token.length > 0;
      } catch (e) {
        return false;
      }
    },
    'Register - Response contains user data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.user && data.user.name === newUser.name;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('User Registration', response, 201);
}

/**
 * Test authentication validation
 */
function testAuthValidation() {
  // First ensure we have a token
  if (!global.authToken) {
    const auth = loginTestUser();
    if (auth) {
      global.authToken = auth.token;
    } else {
      console.error('Failed to authenticate for validation test');
      return;
    }
  }
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.ME}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY,
        'Authorization': `Bearer ${global.authToken}`
      }
    }
  );
  
  const isValid = check(response, {
    'Auth validation - Status is 200': (r) => r.status === 200,
    'Auth validation - Response time < 500ms': (r) => r.timings.duration < 500,
    'Auth validation - Response contains user data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && data.data && data.data.user;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Auth Validation', response, 200);
}

/**
 * Test invalid login attempts
 */
function testInvalidLogin() {
  const invalidLoginData = {
    name: 'nonexistent_user',
    password: 'wrong_password'
  };
  
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.LOGIN}`,
    JSON.stringify(invalidLoginData),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY
      }
    }
  );
  
  const isValid = check(response, {
    'Invalid login - Status is 401': (r) => r.status === 401,
    'Invalid login - Response time < 1s': (r) => r.timings.duration < 1000,
    'Invalid login - Response contains error message': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === false && data.message;
      } catch (e) {
        return false;
      }
    }
  });
  
  logTestResult('Invalid Login', response, 401);
}

export function setup() {
  console.log('Setting up authentication tests...');
  
  // Verify API Gateway is accessible
  const healthResponse = http.get(`${CONFIG.BASE_URL}/health`, {
    headers: { 'X-API-Key': CONFIG.API_KEY }
  });
  
  if (healthResponse.status !== 200) {
    console.error('API Gateway health check failed:', healthResponse.status);
  }
  
  return {};
}

export function teardown() {
  console.log('Authentication tests completed');
}
