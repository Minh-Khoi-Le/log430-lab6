import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, ENDPOINTS } from '../config/config.js';
import { loginTestUser } from '../utils/auth.js';

/**
 * Quick Multi-User Validation Test
 * 
 * This is a simplified version of the multi-user test to verify
 * that the threshold configurations are working correctly.
 * Includes rate limiting handling for API Gateway.
 */

export const options = {
  stages: [
    { duration: '45s', target: 2 },  // Reduced load
    { duration: '1m', target: 3 },   // Gentle ramp-up
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    // Basic valid k6 thresholds - more lenient for rate-limited environment
    http_req_duration: ['p(95)<5000'],  // Allow more time for rate-limited responses
    http_req_failed: ['rate<0.3'],      // Allow higher failure rate due to rate limiting
    http_reqs: ['rate>0.5'],            // Lower request rate requirement
    checks: ['rate>0.7'],               // Lower success rate due to rate limiting
    
    // VU monitoring (valid k6 metrics)
    'vus': ['value>1'],
    'vus_max': ['value>3']
  },
  tags: {
    service: 'validation-test',
    endpoint: 'multi-user-validation'
  }
};

export default function() {
  // Add random delay to spread out requests and avoid rate limiting
  sleep(Math.random() * 2 + 1); // 1-3 second delay
  
  // Simple authentication test with retry logic
  let auth = null;
  let retries = 3;
  
  while (retries > 0 && !auth) {
    try {
      auth = loginTestUser(__VU % 3);
      if (!auth) {
        console.log(`VU ${__VU} - Authentication attempt failed, retrying in 2 seconds...`);
        sleep(2);
        retries--;
      }
    } catch (error) {
      console.log(`VU ${__VU} - Authentication error: ${error}, retrying...`);
      sleep(2);
      retries--;
    }
  }
  
  if (!auth) {
    console.error(`VU ${__VU} - Authentication failed after all retries`);
    return;
  }
  
  // Add delay before making API request
  sleep(1);
  
  // Simple product browsing test with rate limiting handling
  const response = http.get(
    `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
    {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.API_KEY
      }
    }
  );
  
  // Handle rate limiting responses
  if (response.status === 429) {
    console.log(`VU ${__VU} - Rate limited, waiting before retry...`);
    sleep(5); // Wait 5 seconds for rate limit to reset
    return; // Skip this iteration
  }
  
  check(response, {
    'Products API - Status OK or Rate Limited': (r) => r.status === 200 || r.status === 429,
    'Products API - Response time acceptable': (r) => r.timings.duration < 5000
  });
  
  console.log(`VU ${__VU} - Products API response: ${response.status}`);
  
  // Add delay at end to be respectful of rate limits
  sleep(1);
}

export function setup() {
  console.log('Starting multi-user validation test with rate limiting considerations...');
  console.log('Using reduced load and delays to avoid API rate limits');
  return { testStart: Date.now() };
}

export function teardown(data) {
  const duration = Date.now() - data.testStart;
  console.log(`Multi-user validation test completed in ${duration}ms`);
  console.log('If you see 429 errors, the API Gateway rate limiting is working correctly');
}
