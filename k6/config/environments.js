/**
 * Environment-specific configuration for k6 load testing
 */

export const ENVIRONMENTS = {
  // Local development environment
  local: {
    BASE_URL: 'http://localhost:8000',
    API_KEY: 'frontend-app-key-12345',
    THINK_TIME: { MIN: 1, MAX: 3 },
    TIMEOUT: '30s',
    THRESHOLDS: {
      FAST: 500,
      ACCEPTABLE: 1000,
      SLOW: 2000,
      CRITICAL: 5000
    }
  },
  
  // Docker development environment
  docker: {
    BASE_URL: 'http://localhost:8000',
    API_KEY: 'frontend-app-key-12345',
    THINK_TIME: { MIN: 1, MAX: 5 },
    TIMEOUT: '45s',
    THRESHOLDS: {
      FAST: 800,
      ACCEPTABLE: 1500,
      SLOW: 3000,
      CRITICAL: 8000
    }
  },
  
  // CI/CD environment
  ci: {
    BASE_URL: 'http://localhost:8000',
    API_KEY: 'frontend-app-key-12345',
    THINK_TIME: { MIN: 0.5, MAX: 2 },
    TIMEOUT: '20s',
    THRESHOLDS: {
      FAST: 1000,
      ACCEPTABLE: 2000,
      SLOW: 4000,
      CRITICAL: 10000
    }
  },
  
  // Production-like environment
  staging: {
    BASE_URL: 'https://staging.example.com',
    API_KEY: 'staging-api-key',
    THINK_TIME: { MIN: 2, MAX: 5 },
    TIMEOUT: '60s',
    THRESHOLDS: {
      FAST: 300,
      ACCEPTABLE: 800,
      SLOW: 1500,
      CRITICAL: 3000
    }
  }
};

// Load balancing configurations
export const LOAD_PATTERNS = {
  // Smoke test - minimal load to verify functionality
  smoke: {
    stages: [{ duration: '1m', target: 5 }],
    description: 'Minimal load to verify basic functionality'
  },
  
  // Load test - normal expected load
  load: {
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 0 }
    ],
    description: 'Normal expected load pattern'
  },
  
  // Stress test - beyond normal capacity
  stress: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 50 },
      { duration: '10m', target: 50 },
      { duration: '2m', target: 20 },
      { duration: '2m', target: 0 }
    ],
    description: 'Above normal load to test system limits'
  },
  
  // Spike test - sudden traffic increase
  spike: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 100 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 }
    ],
    description: 'Sudden traffic spikes'
  },
  
  // Soak test - sustained load
  soak: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '30m', target: 20 },
      { duration: '2m', target: 0 }
    ],
    description: 'Sustained load over extended period'
  },
  
  // Breakpoint test - find system limits
  breakpoint: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '5m', target: 300 },
      { duration: '2m', target: 0 }
    ],
    description: 'Gradually increase load to find breaking point'
  }
};

// Test scenarios for different user types
export const USER_SCENARIOS = {
  // Regular customer behavior
  customer: {
    weight: 70,
    description: 'Regular customer shopping behavior',
    actions: [
      'browse_products',
      'search_products',
      'view_product_details',
      'check_stock',
      'make_purchase',
      'view_order_history'
    ]
  },
  
  // Store manager behavior
  manager: {
    weight: 20,
    description: 'Store manager administrative tasks',
    actions: [
      'view_dashboard',
      'manage_inventory',
      'process_refunds',
      'view_sales_reports',
      'update_product_info',
      'manage_stock_levels'
    ]
  },
  
  // System administrator behavior
  admin: {
    weight: 10,
    description: 'System administrator tasks',
    actions: [
      'manage_users',
      'system_health_check',
      'view_system_metrics',
      'manage_stores',
      'configure_system'
    ]
  }
};

// Performance thresholds for different test types
export const PERFORMANCE_CRITERIA = {
  // Response time thresholds
  response_time: {
    'http_req_duration': {
      smoke: ['p(95)<2000'],
      load: ['p(95)<1500'],
      stress: ['p(95)<3000'],
      spike: ['p(95)<5000'],
      soak: ['p(95)<2000']
    }
  },
  
  // Error rate thresholds
  error_rate: {
    'http_req_failed': {
      smoke: ['rate<0.01'],
      load: ['rate<0.05'],
      stress: ['rate<0.1'],
      spike: ['rate<0.2'],
      soak: ['rate<0.02']
    }
  },
  
  // Request rate thresholds
  request_rate: {
    'http_reqs': {
      smoke: ['rate>1'],
      load: ['rate>5'],
      stress: ['rate>10'],
      spike: ['rate>20'],
      soak: ['rate>3']
    }
  },
  
  // Success rate thresholds
  success_rate: {
    'checks': {
      smoke: ['rate>0.95'],
      load: ['rate>0.9'],
      stress: ['rate>0.85'],
      spike: ['rate>0.8'],
      soak: ['rate>0.9']
    }
  }
};

// Get environment configuration
export function getEnvironmentConfig() {
  const env = __ENV.ENVIRONMENT || 'local';
  return ENVIRONMENTS[env] || ENVIRONMENTS.local;
}

// Get load pattern configuration
export function getLoadPattern() {
  const pattern = __ENV.LOAD_PATTERN || 'load';
  return LOAD_PATTERNS[pattern] || LOAD_PATTERNS.load;
}

// Get performance thresholds for test type
export function getPerformanceThresholds() {
  const testType = __ENV.TEST_TYPE || 'load';
  
  const thresholds = {};
  
  Object.keys(PERFORMANCE_CRITERIA).forEach(category => {
    Object.keys(PERFORMANCE_CRITERIA[category]).forEach(metric => {
      thresholds[metric] = PERFORMANCE_CRITERIA[category][metric][testType] || 
                          PERFORMANCE_CRITERIA[category][metric]['load'];
    });
  });
  
  return thresholds;
}

export default {
  ENVIRONMENTS,
  LOAD_PATTERNS,
  USER_SCENARIOS,
  PERFORMANCE_CRITERIA,
  getEnvironmentConfig,
  getLoadPattern,
  getPerformanceThresholds
};
