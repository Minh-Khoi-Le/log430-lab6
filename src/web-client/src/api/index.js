/**
 * Kong API Gateway Integration Notes:
 * 
 * 1. Public Endpoints (no auth required):
 *    - GET /stores (catalog-service-public)
 * 
 * 2. Authenticated Endpoints (require API key):
 *    - All other endpoints require 'apikey' or 'X-API-Key' header
 *    - API Key: frontend-app-key-12345 (for frontend-app consumer)
 * 
 * 3. Service Routing in Kong:
 *    - /auth, /users -> user-service:3000/api
 *    - /products, /stock, /dashboard -> catalog-service:3000/api  
 *    - /sales, /refunds -> transaction-service:3000/api
 *    - /stores (public) -> catalog-service:3000/api/stores
 */

// Base URL for all API requests - Kong API Gateway
// In development with Vite proxy, this should be relative
// In production, this should be the full URL to Kong
export const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "" : "http://localhost:8000");

// API Gateway configuration
export const API_CONFIG = {
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": import.meta.env.VITE_API_KEY || "frontend-app-key-12345", // Frontend API key for Kong Gateway
  },
};

// Microservice endpoint mappings for API Gateway
export const API_ENDPOINTS = {
  // User Service endpoints (via Kong)
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout"
  },
  USERS: {
    BASE: "/api/users",
    PROFILE: "/api/users/profile",
    BY_ID: (id) => `/api/users/${id}`
  },
  
  // Catalog Service endpoints (via Kong)
  PRODUCTS: {
    BASE: "/api/products",
    BY_ID: (id) => `/api/products/${id}`,
    SEARCH: "/api/products/search"
  },
  
  // Store Service endpoints (via Kong)
  STORES: {
    BASE: "/api/stores",
    BY_ID: (id) => `/api/stores/${id}`,
    PRODUCTS: (storeId) => `/api/stores/${storeId}/products`
  },
  
  // Stock Service endpoints (via Kong) - corrected paths
  STOCK: {
    BASE: "/api/stock",
    BY_PRODUCT: (productId) => `/api/stock/product/${productId}`,
    BY_STORE: (storeId) => `/api/stock/store/${storeId}`,
    BY_ID: (id) => `/api/stock/${id}`,
    ADJUST: "/api/stock/adjust",
    RESERVE: "/api/stock/reserve",
    LOW: "/api/stock/low"
  },
  
  // Transaction Service endpoints (via Kong)
  SALES: {
    BASE: "/api/sales",
    BY_ID: (id) => `/api/sales/${id}`,
    BY_USER: (userId) => `/api/sales/user/${userId}`,
    CREATE: "/api/sales",
    BY_CUSTOMER: (customerId) => `/api/sales/user/${customerId}` // Fixed: use user endpoint
  },
  
  // Refund Service endpoints (via Kong)
  REFUNDS: {
    BASE: "/api/refunds",
    BY_ID: (id) => `/api/refunds/${id}`,
    BY_USER: (userId) => `/api/refunds/user/${userId}`,
    CREATE: "/api/refunds"
  },

  // Dashboard Service endpoints (via Kong)
  DASHBOARD: {
    STATS: "/api/dashboard/stats"
  }
};

/**
 * Public endpoints that don't require API key authentication
 */
const PUBLIC_ENDPOINTS = [
  '/api/stores' // This endpoint is configured as public in Kong
];

/**
 * Check if an endpoint is public (doesn't require API key)
 */
const isPublicEndpoint = (path) => {
  return PUBLIC_ENDPOINTS.some(publicPath => path.startsWith(publicPath));
}

/**
 * Build configuration for Kong API Gateway requests
 */
const buildRequestConfig = (path, options, token) => {
  const isPublic = isPublicEndpoint(path);
  
  const headers = {
    ...API_CONFIG.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  // Only add API key for non-public endpoints
  if (!isPublic) {
    headers.apikey = import.meta.env.VITE_API_KEY || "frontend-app-key-12345";
  }
  
  return {
    ...options,
    headers,
  };
};

/**
 * Handle Kong Gateway specific errors
 */
const handleKongError = (error, path, config) => {
  console.error('Kong API Gateway Error:', {
    path: path,
    isPublic: isPublicEndpoint(path),
    method: config.method || 'GET',
    error: error.message,
    hasApiKey: !!config.headers.apikey,
    hasAuth: !!config.headers.Authorization
  });
  
  // CORS-specific error handling
  if (error.message.includes('CORS') || error.message.includes('Access to fetch')) {
    throw new Error('CORS error: Kong Gateway not accessible from frontend. Check if Kong is running and CORS is configured.');
  }
  if (error.message.includes('Failed to fetch') && error.message.includes('localhost')) {
    throw new Error('Kong Gateway connection failed: Service may be down or unreachable at localhost:8000');
  }
  if (error.message.includes('ERR_FAILED') || error.message.includes('net::ERR_CONNECTION_REFUSED')) {
    throw new Error('Kong Gateway is not running on localhost:8000. Please start Kong Gateway and backend services.');
  }
  if (error.message.includes('404')) {
    throw new Error('Resource not found - check if the service is available in Kong Gateway');
  }
  if (error.message.includes('502') || error.message.includes('503')) {
    throw new Error('Service unavailable - backend service may be down');
  }
  
  throw error;
};

/**
 * Process Kong Gateway response
 */
const processResponse = async (res) => {
  if (res.status === 204) {
    // No Content: treat as success, return null or a success object
    return null;
  }
  if (!res.ok) {
    let errorText;
    try {
      errorText = await res.text();
    } catch {
      errorText = `HTTP ${res.status} ${res.statusText}`;
    }
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const jsonResponse = await res.json();
    if (!res.ok && jsonResponse.success === false) {
      throw new Error(`API Error ${res.status}: ${jsonResponse.message || jsonResponse.error || 'Unknown error'}`);
    }
    return jsonResponse;
  }
  
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }
  throw new Error(`API Error 502: An invalid response was received from the upstream server, request_id: "${text}"`);
};

/**
 * Enhanced API fetch function for Kong API Gateway
 */
export async function apiFetch(path, options = {}, token = null) {
  const config = buildRequestConfig(path, options, token);
  const fullUrl = `${API_BASE}${path}`;

  console.log('API Request:', {
    url: fullUrl,
    method: config.method || 'GET',
    headers: config.headers,
    isPublic: isPublicEndpoint(path)
  });

  try {
    const res = await fetch(fullUrl, {
      ...config,
      // Only set CORS mode and credentials for production (when making cross-origin requests)
      ...(import.meta.env.DEV ? {} : {
        mode: 'cors',
        credentials: isPublicEndpoint(path) ? 'omit' : 'include'
      })
    });
    
    console.log('API Response:', {
      url: fullUrl,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });
    
    return await processResponse(res);
  } catch (error) {
    console.error('Fetch Error:', {
      url: fullUrl,
      error: error.message,
      type: error.constructor.name
    });
    handleKongError(error, path, config);
  }
}

/**
 * Authenticated API fetch - automatically includes user token
 * 
 * @param {string} path - API endpoint path
 * @param {Object} options - Fetch options
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
export async function authenticatedFetch(path, token, options = {}) {
  return apiFetch(path, options, token);
}

/**
 * Legacy fetch function for backward compatibility
 * Redirects to apiFetch with API Gateway configuration
 */
export const fetchAPI = apiFetch;

// Service classes for easy usage in components
export const StoreService = {
  getStores: async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.STORES.BASE);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching stores:', error);
      // Return mock data for development
      return [
        { id: 1, name: 'Downtown Store', address: '123 Main St', status: 'active' },
        { id: 2, name: 'Mall Location', address: '456 Shopping Center', status: 'active' },
        { id: 3, name: 'Airport Branch', address: '789 Airport Rd', status: 'inactive' }
      ];
    }
  },
  
  getStore: async (id) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.STORES.BY_ID(id));
      return response.data || response;
    } catch (error) {
      console.error('Error fetching store:', error);
      throw error;
    }
  }
};

export const InventoryService = {
  getInventory: async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.STOCK.BASE);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Return mock data for development
      return [
        { storeId: 1, productId: 1, quantity: 25, store: { name: 'Downtown Store' }, product: { name: 'Laptop Pro', price: 1299.99 } },
        { storeId: 1, productId: 2, quantity: 5, store: { name: 'Downtown Store' }, product: { name: 'Wireless Mouse', price: 49.99 } },
        { storeId: 2, productId: 1, quantity: 0, store: { name: 'Mall Location' }, product: { name: 'Laptop Pro', price: 1299.99 } },
        { storeId: 2, productId: 3, quantity: 15, store: { name: 'Mall Location' }, product: { name: 'USB Cable', price: 19.99 } }
      ];
    }
  },
  
  updateStock: async (storeId, productId, quantity) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.STOCK.UPDATE, {
        method: 'PUT',
        body: JSON.stringify({ storeId, productId, quantity })
      });
      return response.data || response;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }
};

export const SalesService = {
  getSales: async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.SALES.BASE);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching sales:', error);
      // Return mock data for development
      return [
        { 
          id: 1, 
          date: new Date().toISOString(), 
          storeId: 1, 
          userId: 1, 
          total: 1299.99, 
          status: 'active',
          store: { name: 'Downtown Store' },
          user: { name: 'John Doe' }
        },
        { 
          id: 2, 
          date: new Date(Date.now() - 86400000).toISOString(), 
          storeId: 2, 
          userId: 2, 
          total: 49.99, 
          status: 'refunded',
          store: { name: 'Mall Location' },
          user: { name: 'Jane Smith' }
        }
      ];
    }
  },
  
  getUserSales: async (userId) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.SALES.BY_USER(userId));
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching user sales:', error);
      return [];
    }
  },
  
  getSale: async (id) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.SALES.BY_ID(id));
      return response.data || response;
    } catch (error) {
      console.error('Error fetching sale:', error);
      throw error;
    }
  },
  
  createSale: async (saleData) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.SALES.CREATE, {
        method: 'POST',
        body: JSON.stringify(saleData)
      });
      return response.data || response;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }
};

export const RefundService = {
  getRefunds: async () => {
    try {
      const response = await apiFetch(API_ENDPOINTS.REFUNDS.BASE);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching refunds:', error);
      // Return mock data for development
      return [
        { 
          id: 1, 
          date: new Date().toISOString(), 
          saleId: 2,
          storeId: 2, 
          userId: 2, 
          total: 49.99, 
          reason: 'Product defective',
          store: { name: 'Mall Location' },
          user: { name: 'Jane Smith' }
        },
        { 
          id: 2, 
          date: new Date(Date.now() - 172800000).toISOString(), 
          saleId: 5,
          storeId: 1, 
          userId: 3, 
          total: 25.50, 
          reason: 'Customer changed mind',
          store: { name: 'Downtown Store' },
          user: { name: 'Bob Johnson' }
        }
      ];
    }
  },
  
  getUserRefunds: async (userId) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.REFUNDS.BASE + `?userId=${userId}`);
      return response.data || response || [];
    } catch (error) {
      console.error('Error fetching user refunds:', error);
      return [];
    }
  },
  
  getRefund: async (id) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.REFUNDS.BY_ID(id));
      return response.data || response;
    } catch (error) {
      console.error('Error fetching refund:', error);
      throw error;
    }
  },
  
  createRefund: async (refundData) => {
    try {
      const response = await apiFetch(API_ENDPOINTS.REFUNDS.CREATE, {
        method: 'POST',
        body: JSON.stringify(refundData)
      });
      return response.data || response;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }
};
