import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { CONFIG, HTTP_OPTIONS } from '../config/config.js';

// Custom metrics
export const errorRate = new Rate('errors');
export const successRate = new Rate('success');

/**
 * Utility function to add authentication headers
 */
export function addAuthHeader(token) {
  return {
    ...HTTP_OPTIONS,
    headers: {
      ...HTTP_OPTIONS.headers,
      'Authorization': `Bearer ${token}`
    }
  };
}

/**
 * Utility function to simulate user think time
 */
export function thinkTime(minSeconds, maxSeconds) {
  let min = minSeconds || CONFIG.THINK_TIME.MIN;
  let max = maxSeconds || CONFIG.THINK_TIME.MAX;
  const thinkTime = Math.random() * (max - min) + min;
  sleep(thinkTime);
}

/**
 * Utility function to validate response with rate limiting awareness
 */
export function validateResponse(response, expectedStatus = 200, description = 'Request') {
  // Handle rate limiting as a special case
  if (response.status === 429) {
    console.log(`${description} - Rate limited (429), this is expected behavior`);
    return false; // Not an error, but not successful either
  }
  
  const isValid = check(response, {
    [`${description} - Status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${description} - Response time < ${CONFIG.THRESHOLDS.ACCEPTABLE}ms`]: (r) => r.timings.duration < CONFIG.THRESHOLDS.ACCEPTABLE,
  });
  
  if (isValid) {
    successRate.add(1);
  } else {
    errorRate.add(1);
    console.error(`${description} failed:`, {
      status: response.status,
      body: response.body,
      duration: response.timings.duration
    });
  }
  
  return isValid;
}

/**
 * Utility function to validate JSON response
 */
export function validateJsonResponse(response, expectedStatus = 200, description = 'Request') {
  const isValid = check(response, {
    [`${description} - Status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${description} - Response time < ${CONFIG.THRESHOLDS.ACCEPTABLE}ms`]: (r) => r.timings.duration < CONFIG.THRESHOLDS.ACCEPTABLE,
    [`${description} - Response is JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (isValid) {
    successRate.add(1);
  } else {
    errorRate.add(1);
    console.error(`${description} failed:`, {
      status: response.status,
      body: response.body.substring(0, 200), // Log first 200 chars
      duration: response.timings.duration
    });
  }
  
  return isValid;
}

/**
 * Utility function to get random item from array
 */
export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Utility function to get random integer between min and max
 */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Utility function to generate random string
 */
export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Utility function to generate fake user data
 */
export function generateFakeUser() {
  const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'diana', 'edward', 'fiona'];
  const suffixes = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
  
  const firstName = getRandomItem(names);
  const lastName = getRandomItem(suffixes);
  const username = `${firstName}_${lastName}_${getRandomInt(1, 9999)}`;
  
  return {
    name: username,
    password: `password123`,
    role: 'client'
  };
}

/**
 * Utility function to generate fake product data
 */
export function generateFakeProduct() {
  const adjectives = ['Premium', 'Deluxe', 'Pro', 'Ultra', 'Advanced', 'Smart', 'Digital', 'Modern'];
  const nouns = ['Widget', 'Gadget', 'Device', 'Tool', 'Accessory', 'Component', 'System', 'Solution'];
  const categories = ['Electronics', 'Appliances', 'Sports', 'Books', 'Clothing', 'Home', 'Garden', 'Tools'];
  
  const name = `${getRandomItem(adjectives)} ${getRandomItem(nouns)} ${getRandomInt(1, 100)}`;
  const price = Math.round((Math.random() * 500 + 10) * 100) / 100; // $10-$510
  const category = getRandomItem(categories);
  
  return {
    name,
    price,
    category,
    description: `A high-quality ${name.toLowerCase()} perfect for everyday use.`
  };
}

/**
 * Utility function to generate fake store data
 */
export function generateFakeStore() {
  const storeTypes = ['Store', 'Shop', 'Mart', 'Center', 'Outlet', 'Plaza', 'Mall', 'Market'];
  const locations = ['Downtown', 'Uptown', 'Suburban', 'Metro', 'Central', 'North', 'South', 'East', 'West'];
  const streets = ['Main St', 'Broadway', 'Oak Ave', 'Park Blvd', 'First Ave', 'Second St', 'Third Ave', 'Fourth St'];
  
  const name = `${getRandomItem(locations)} ${getRandomItem(storeTypes)}`;
  const address = `${getRandomInt(100, 9999)} ${getRandomItem(streets)}`;
  
  return {
    name,
    address,
    status: 'active'
  };
}

/**
 * Utility function to wait for service readiness
 */
export function waitForService(healthEndpoint, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    const response = http.get(`${CONFIG.BASE_URL}${healthEndpoint}`, HTTP_OPTIONS);
    if (response.status === 200) {
      console.log(`Service ${healthEndpoint} is ready`);
      return true;
    }
    console.log(`Waiting for service ${healthEndpoint}... (${i + 1}/${maxRetries})`);
    sleep(2);
  }
  console.error(`Service ${healthEndpoint} is not ready after ${maxRetries} retries`);
  return false;
}

/**
 * Utility function to parse JSON response safely
 */
export function parseJson(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error('Failed to parse JSON response:', response.body);
    return null;
  }
}

/**
 * Utility function to log test results
 */
export function logTestResult(testName, response, expectedStatus = 200) {
  const isSuccess = response.status === expectedStatus;
  const status = isSuccess ? 'PASS' : 'FAIL';
  
  console.log(`[${status}] ${testName} - Status: ${response.status}, Duration: ${response.timings.duration}ms`);
  
  if (!isSuccess) {
    console.error(`Response body: ${response.body.substring(0, 200)}`);
  }
  
  return isSuccess;
}
