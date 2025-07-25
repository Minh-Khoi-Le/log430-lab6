import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, ENDPOINTS } from '../config/config.js';

/**
 * Rate Limiting Test
 * 
 * This test specifically checks how the API Gateway handles rate limiting
 * and provides guidance on proper test configuration.
 */

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // Single user test
    { duration: '1m', target: 1 },   // Sustained single user
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    // Very lenient thresholds for rate limiting test
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.8'],     // Allow high failure rate due to rate limiting
    checks: ['rate>0.3']               // Low success rate expected
  }
};

export default function() {
  console.log(`VU ${__VU} - Starting rate limiting test...`);
  
  // Test 1: Check basic connectivity
  testBasicConnectivity();
  
  // Test 2: Test rate limiting behavior
  testRateLimiting();
  
  // Test 3: Test recovery after rate limiting
  testRecovery();
}

function testBasicConnectivity() {
  console.log(`VU ${__VU} - Testing basic connectivity...`);
  
  const response = http.get(
    `${CONFIG.BASE_URL}/health`,
    {
      headers: {
        'X-API-Key': CONFIG.API_KEY
      }
    }
  );
  
  check(response, {
    'Health Check - Connectivity OK': (r) => r.status === 200 || r.status === 404
  });
  
  console.log(`VU ${__VU} - Health check status: ${response.status}`);
  sleep(1);
}

function testRateLimiting() {
  console.log(`VU ${__VU} - Testing rate limiting behavior...`);
  
  // Make multiple rapid requests to trigger rate limiting
  for (let i = 0; i < 5; i++) {
    const loginData = {
      name: 'admin',
      password: 'admin123'
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
    
    console.log(`VU ${__VU} - Request ${i + 1} status: ${response.status}`);
    
    if (response.status === 429) {
      console.log(`VU ${__VU} - Rate limiting triggered at request ${i + 1}`);
      
      // Try to parse rate limit headers
      try {
        const rateLimitHeaders = {
          'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
          'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
          'x-ratelimit-reset': response.headers['x-ratelimit-reset'],
          'retry-after': response.headers['retry-after']
        };
        console.log(`VU ${__VU} - Rate limit headers:`, JSON.stringify(rateLimitHeaders));
      } catch (e) {
        console.log(`VU ${__VU} - Could not parse rate limit headers`);
      }
      
      break; // Stop making requests once rate limited
    }
    
    check(response, {
      'Auth Request - Status OK or Rate Limited': (r) => r.status === 200 || r.status === 429
    });
    
    sleep(0.1); // Short delay between requests
  }
}

function testRecovery() {
  console.log(`VU ${__VU} - Testing recovery after rate limiting...`);
  
  // Wait for rate limit to reset
  console.log(`VU ${__VU} - Waiting 10 seconds for rate limit to reset...`);
  sleep(10);
  
  // Try request again
  const loginData = {
    name: 'admin',
    password: 'admin123'
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
  
  console.log(`VU ${__VU} - Recovery test status: ${response.status}`);
  
  check(response, {
    'Recovery - Request succeeds after wait': (r) => r.status === 200 || r.status === 201
  });
}

export function setup() {
  console.log('='.repeat(50));
  console.log('Rate Limiting Test');
  console.log('='.repeat(50));
  console.log('This test will:');
  console.log('1. Check basic connectivity');
  console.log('2. Trigger rate limiting intentionally');
  console.log('3. Test recovery after waiting');
  console.log('Expected: Some 429 responses (rate limiting working)');
  console.log('='.repeat(50));
  
  return { testStart: Date.now() };
}

export function teardown(data) {
  const duration = Date.now() - data.testStart;
  console.log('='.repeat(50));
  console.log(`Rate limiting test completed in ${duration}ms`);
  console.log('='.repeat(50));
  console.log('Results Analysis:');
  console.log('- If you see 429 responses: Rate limiting is working correctly');
  console.log('- If all requests succeed: Rate limiting may be disabled');
  console.log('- If all requests fail: Check system connectivity');
  console.log('='.repeat(50));
  console.log('Recommendations for multi-user tests:');
  console.log('- Use lower concurrent user counts (1-3 users)');
  console.log('- Add longer delays between requests (2-5 seconds)');
  console.log('- Use staged ramp-up instead of immediate load');
  console.log('- Consider adjusting Kong rate limiting configuration');
  console.log('='.repeat(50));
}
