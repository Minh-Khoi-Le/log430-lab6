import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG, ENDPOINTS, HTTP_OPTIONS } from '../config/config.js';
import { validateJsonResponse, parseJson } from './helpers.js';

// Token storage for the current VU
let authToken = null;
let currentUser = null;

/**
 * Authenticate user and return token with rate limiting handling
 */
export function authenticate(username, password) {
  const loginData = {
    name: username,
    password: password
  };
  
  let retries = 3;
  let response;
  
  while (retries > 0) {
    response = http.post(
      `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.LOGIN}`,
      JSON.stringify(loginData),
      HTTP_OPTIONS
    );
    
    // Handle rate limiting
    if (response.status === 429) {
      console.log(`Rate limited during authentication, retrying in 3 seconds... (${retries} retries left)`);
      sleep(3);
      retries--;
      continue;
    }
    
    // Success or other error - break out of retry loop
    break;
  }
  
  if (validateJsonResponse(response, 200, 'Login')) {
    const responseData = parseJson(response);
    if (responseData && responseData.token) {
      authToken = responseData.token;
      currentUser = responseData.user;
      return {
        token: authToken,
        user: currentUser,
        userId: responseData.user?.id
      };
    }
  }
  
  // Log the failure details for debugging
  if (response.status === 429) {
    console.log(`Authentication failed due to rate limiting after all retries`);
  } else {
    console.log(`Authentication failed: ${JSON.stringify({
      status: response.status,
      body: response.body,
      duration: response.timings.duration
    })}`);
  }
  
  return null;
}

/**
 * Register a new user
 */
export function register(userData) {
  const response = http.post(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.REGISTER}`,
    JSON.stringify(userData),
    HTTP_OPTIONS
  );
  
  if (validateJsonResponse(response, 201, 'Register')) {
    const responseData = parseJson(response);
    if (responseData && responseData.token) {
      authToken = responseData.token;
      currentUser = responseData.user;
      return {
        token: authToken,
        user: currentUser
      };
    }
  }
  
  return null;
}

/**
 * Get current user information
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current authentication token
 */
export function getAuthToken() {
  return authToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return authToken !== null;
}

/**
 * Clear authentication data
 */
export function clearAuth() {
  authToken = null;
  currentUser = null;
}

/**
 * Login with a test user (for load testing)
 */
export function loginTestUser(userIndex = 0) {
  const testUsers = CONFIG.TEST_DATA.USERS;
  const user = testUsers[userIndex % testUsers.length];
  
  return authenticate(user.name, user.password);
}

/**
 * Login with admin user
 */
export function loginAdmin() {
  const adminUser = CONFIG.TEST_DATA.USERS.find(u => u.role === 'admin');
  if (adminUser) {
    return authenticate(adminUser.name, adminUser.password);
  }
  return null;
}

/**
 * Login with manager user
 */
export function loginManager() {
  const managerUser = CONFIG.TEST_DATA.USERS.find(u => u.role === 'manager');
  if (managerUser) {
    return authenticate(managerUser.name, managerUser.password);
  }
  return null;
}

/**
 * Login with client user
 */
export function loginClient() {
  const clientUsers = CONFIG.TEST_DATA.USERS.filter(u => u.role === 'client');
  if (clientUsers.length > 0) {
    const randomClient = clientUsers[Math.floor(Math.random() * clientUsers.length)];
    return authenticate(randomClient.name, randomClient.password);
  }
  return null;
}

/**
 * Validate current authentication
 */
export function validateAuth() {
  if (!authToken) {
    return false;
  }
  
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.ME}`,
    {
      headers: {
        ...HTTP_OPTIONS.headers,
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  return validateJsonResponse(response, 200, 'Auth validation');
}

export default {
  authenticate,
  register,
  getCurrentUser,
  getAuthToken,
  isAuthenticated,
  clearAuth,
  loginTestUser,
  loginAdmin,
  loginManager,
  loginClient,
  validateAuth
};
