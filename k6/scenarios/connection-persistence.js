import http from 'k6/http';
import { check, group } from 'k6';
import { CONFIG, ENDPOINTS } from '../config/config.js';
import { thinkTime, logTestResult, addAuthHeader, getRandomItem } from '../utils/helpers.js';
import { loginTestUser } from '../utils/auth.js';
import { SharedArray } from 'k6/data';

/**
 * Connection Persistence Test
 * 
 * This test simulates users who stay connected for extended periods,
 * mimicking real-world scenarios where users keep browser tabs open
 * or stay logged in for long periods.
 * 
 * Features:
 * - Long-running user sessions (15-30 minutes)
 * - Periodic activity bursts
 * - Connection keep-alive behavior
 * - Realistic idle periods
 * - Session state maintenance
 */

// Realistic user activities during long sessions
const userActivities = new SharedArray('user_activities', function() {
  return [
    { action: 'browse_products', frequency: 0.4, duration: 30 },
    { action: 'search_items', frequency: 0.3, duration: 20 },
    { action: 'check_inventory', frequency: 0.2, duration: 15 },
    { action: 'view_sales', frequency: 0.1, duration: 25 },
    { action: 'manage_stock', frequency: 0.1, duration: 40 },
    { action: 'idle_browsing', frequency: 0.6, duration: 120 }
  ];
});

export const options = {
  stages: [
    // Simulate users connecting throughout the day and staying connected
    { duration: '3m', target: 15 },   // Early users connect
    { duration: '5m', target: 30 },   // More users join
    { duration: '10m', target: 45 },  // Peak concurrent connections
    { duration: '15m', target: 60 },  // Sustained high connections
    { duration: '20m', target: 75 },  // Maximum persistent connections
    { duration: '10m', target: 60 },  // Some users disconnect
    { duration: '5m', target: 30 },   // Gradual decrease
    { duration: '2m', target: 0 }     // All users disconnect
  ],
  thresholds: {
    // Long-session thresholds
    http_req_duration: ['p(95)<2000'],     // Good performance maintained
    http_req_failed: ['rate<0.08'],        // Low error rate for persistent connections
    http_reqs: ['rate>3'],                 // Consistent activity
    checks: ['rate>0.92'],                 // High success rate
    
    // Connection-specific metrics
    'http_req_connecting': ['p(95)<500'],   // Fast connection establishment
    'http_req_tls_handshaking': ['p(95)<1000'], // TLS handshake performance
    
    // VU (Virtual User) monitoring for persistent connections
    'vus': ['value>10'],                    // Maintain at least 10 active virtual users
    'vus_max': ['value>75'],                // Maximum concurrent virtual users
    
    // Activity-specific thresholds
    'http_req_duration{activity:browse}': ['p(95)<1500'],
    'http_req_duration{activity:search}': ['p(95)<1000'],
    'http_req_duration{activity:inventory}': ['p(95)<1200'],
    'http_req_duration{activity:sales}': ['p(95)<2000']
  },
  tags: {
    service: 'persistence-test',
    endpoint: 'long-sessions'
  }
};

export default function() {
  // Create a persistent user session
  const userSession = initializePersistentSession();
  
  // Execute long-running session
  executePersistentSession(userSession);
}

/**
 * Initialize a persistent user session
 */
function initializePersistentSession() {
  const auth = loginTestUser(__VU % 5);
  if (!auth) {
    console.error('Failed to initialize persistent session');
    return null;
  }
  
  const sessionId = `persistent_${__VU}_${Date.now()}`;
  console.log(`Initializing persistent session: ${sessionId}`);
  
  return {
    token: auth.token,
    userId: auth.userId,
    sessionId: sessionId,
    sessionStart: Date.now(),
    totalActivities: 0,
    lastActivity: Date.now(),
    activityHistory: []
  };
}

/**
 * Execute a long-running persistent session
 */
function executePersistentSession(session) {
  if (!session) return;
  
  const sessionTags = {
    session_id: session.sessionId,
    session_type: 'persistent'
  };
  
  group('Persistent Session', () => {
    // Session duration: 15-30 minutes of activities
    const sessionDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    const sessionEndTime = session.sessionStart + sessionDuration;
    
    while (Date.now() < sessionEndTime) {
      // Choose random activity
      const activity = chooseActivity();
      
      // Execute activity
      executeActivity(session, activity, sessionTags);
      
      // Update session state
      session.totalActivities++;
      session.lastActivity = Date.now();
      session.activityHistory.push({
        activity: activity.action,
        timestamp: Date.now()
      });
      
      // Realistic pause between activities
      const pauseDuration = activity.duration || 30;
      thinkTime(pauseDuration * 0.8, pauseDuration * 1.2);
      
      // Periodic keep-alive check
      if (session.totalActivities % 10 === 0) {
        performKeepAlive(session, sessionTags);
      }
    }
    
    // Session summary
    const finalDuration = Date.now() - session.sessionStart;
    console.log(`Session ${session.sessionId} completed: ${finalDuration}ms, ${session.totalActivities} activities`);
  });
}

/**
 * Choose activity based on frequency weights
 */
function chooseActivity() {
  const random = Math.random();
  let cumulativeFrequency = 0;
  
  for (const activity of userActivities) {
    cumulativeFrequency += activity.frequency;
    if (random <= cumulativeFrequency) {
      return activity;
    }
  }
  
  // Fallback to first activity
  return userActivities[0];
}

/**
 * Execute specific activity
 */
function executeActivity(session, activity, baseTags) {
  const activityTags = {
    ...baseTags,
    activity: activity.action
  };
  
  switch (activity.action) {
    case 'browse_products':
      browseProducts(session, activityTags);
      break;
    case 'search_items':
      searchItems(session, activityTags);
      break;
    case 'check_inventory':
      checkInventory(session, activityTags);
      break;
    case 'view_sales':
      viewSales(session, activityTags);
      break;
    case 'manage_stock':
      manageStock(session, activityTags);
      break;
    case 'idle_browsing':
      idleBrowsing(session, activityTags);
      break;
    default:
      browseProducts(session, activityTags);
  }
}

/**
 * Browse products activity
 */
function browseProducts(session, tags) {
  group('Browse Products', () => {
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'Browse Products - Status OK': (r) => r.status === 200,
      'Browse Products - Response under 1.5s': (r) => r.timings.duration < 1500,
      'Browse Products - Connection maintained': (r) => r.headers['Connection'] !== 'close'
    });
    
    logTestResult('Browse Products', response, 200);
  });
}

/**
 * Search items activity
 */
function searchItems(session, tags) {
  group('Search Items', () => {
    const searchTerms = ['laptop', 'phone', 'headphones', 'shoes', 'book'];
    const term = getRandomItem(searchTerms);
    
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.PRODUCTS.SEARCH}?name=${term}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'Search Items - Status OK': (r) => r.status === 200,
      'Search Items - Response under 1s': (r) => r.timings.duration < 1000,
      'Search Items - Results returned': (r) => r.body.length > 0
    });
    
    logTestResult('Search Items', response, 200);
  });
}

/**
 * Check inventory activity
 */
function checkInventory(session, tags) {
  group('Check Inventory', () => {
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'Check Inventory - Status OK': (r) => r.status === 200,
      'Check Inventory - Response under 1.2s': (r) => r.timings.duration < 1200
    });
    
    logTestResult('Check Inventory', response, 200);
  });
}

/**
 * View sales activity
 */
function viewSales(session, tags) {
  group('View Sales', () => {
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.SALES.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'View Sales - Status OK': (r) => r.status === 200,
      'View Sales - Response under 2s': (r) => r.timings.duration < 2000
    });
    
    logTestResult('View Sales', response, 200);
  });
}

/**
 * Manage stock activity
 */
function manageStock(session, tags) {
  group('Manage Stock', () => {
    // Check low stock first
    const lowStockResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.LOW_STOCK}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(lowStockResponse, {
      'Low Stock Check - Status OK': (r) => r.status === 200,
      'Low Stock Check - Response under 1.5s': (r) => r.timings.duration < 1500
    });
    
    logTestResult('Low Stock Check', lowStockResponse, 200);
    
    // Brief pause between operations
    thinkTime(1, 2);
    
    // Check general stock
    const stockResponse = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STOCK.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(stockResponse, {
      'Stock Management - Status OK': (r) => r.status === 200,
      'Stock Management - Response under 1.2s': (r) => r.timings.duration < 1200
    });
    
    logTestResult('Stock Management', stockResponse, 200);
  });
}

/**
 * Idle browsing activity - minimal activity to maintain connection
 */
function idleBrowsing(session, tags) {
  group('Idle Browsing', () => {
    // Light activity to maintain session
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.STORES.BASE}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'Idle Browsing - Status OK': (r) => r.status === 200,
      'Idle Browsing - Response under 1s': (r) => r.timings.duration < 1000
    });
    
    logTestResult('Idle Browsing', response, 200);
  });
}

/**
 * Perform keep-alive check to maintain connection
 */
function performKeepAlive(session, tags) {
  group('Keep Alive', () => {
    // Simple authentication check to maintain session
    const response = http.get(
      `${CONFIG.BASE_URL}${ENDPOINTS.AUTH.ME}`,
      { headers: { ...addAuthHeader(session.token).headers }, tags }
    );
    
    check(response, {
      'Keep Alive - Status OK': (r) => r.status === 200,
      'Keep Alive - Response under 500ms': (r) => r.timings.duration < 500
    });
    
    logTestResult('Keep Alive', response, 200);
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('Setting up connection persistence test...');
  console.log(`Target URL: ${CONFIG.BASE_URL}`);
  console.log('Test will simulate long-running user sessions');
  console.log('Expected session duration: 15-30 minutes per user');
  
  return {
    testStart: Date.now(),
    baseUrl: CONFIG.BASE_URL
  };
}

/**
 * Teardown function
 */
export function teardown(data) {
  const testDuration = Date.now() - data.testStart;
  console.log(`Connection persistence test completed in ${testDuration}ms`);
  console.log('Review results for connection stability and session management');
}
