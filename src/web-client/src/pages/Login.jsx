/**
 * Login Page
 * 
 * This component handles user authentication with Kong API Gateway.
 * Kong Gateway is REQUIRED - no fallback mode.
 */

import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { apiFetch, API_ENDPOINTS } from "../api";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Fade,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Login as LoginIcon,
  Store as StoreIcon,
  Person as PersonIcon,
  Lock as LockIcon,
} from "@mui/icons-material";

function Login() {
  const [credentials, setCredentials] = useState({
    name: '',
    password: '',
    storeId: ''
  });
  const [stores, setStores] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kongStatus, setKongStatus] = useState('loading'); // 'loading', 'connected', 'error'
  const { setUser } = useUser();

  // Fetch stores on component mount - Kong Gateway is REQUIRED
  useEffect(() => {
    const fetchStores = async () => {
      setKongStatus('loading');
      
      try {
        console.log('Connecting to Kong Gateway (REQUIRED)...');
        console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
        console.log('Fetching stores via Kong Gateway:', API_ENDPOINTS.STORES.BASE);
        
        const response = await apiFetch(API_ENDPOINTS.STORES.BASE);
        const storesData = response.success ? response.data : response;
        const stores = storesData.stores || storesData;
        
        if (Array.isArray(stores) && stores.length > 0) {
          setStores(stores);
          setKongStatus('connected');
          console.log(' Kong Gateway connected successfully! Loaded', stores.length, 'stores');
          setError(''); // Clear any previous errors
        } else {
          throw new Error('Kong Gateway returned no stores data');
        }
      } catch (error) {
        console.error(' Kong Gateway connection FAILED:', error);
        setKongStatus('error');
        setStores([]);
        
        // Provide specific error messages for Kong Gateway issues
        if (error.message.includes('CORS') || error.message.includes('Access to fetch')) {
          setError('CORS error: Kong Gateway not properly configured for frontend access. Check CORS plugin configuration.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED') || error.message.includes('net::ERR_CONNECTION_REFUSED')) {
          setError('Kong Gateway is not running on localhost:8000. Please start Kong Gateway and backend services.');
        } else if (error.message.includes('404')) {
          setError('Store endpoint not found. Kong Gateway routing may be misconfigured.');
        } else if (error.message.includes('502') || error.message.includes('503')) {
          setError('Backend services are unavailable. Check if catalog-service is running and accessible via Kong Gateway.');
        } else {
          setError(`Kong Gateway error: ${error.message}`);
        }
      }
    };
    
    fetchStores();
  }, []);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check if Kong Gateway is available before attempting login
    if (kongStatus !== 'connected') {
      setError('Kong Gateway is not available. Please ensure Kong Gateway and backend services are running.');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login via Kong Gateway:', API_ENDPOINTS.AUTH.LOGIN);
      const response = await apiFetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          name: credentials.name,
          password: credentials.password,
          storeId: credentials.storeId ? parseInt(credentials.storeId) : null
        })
      });
      
      if (response.success && response.user) {
        const selectedStore = stores.find(store => store.id === parseInt(credentials.storeId));
        
        const user = {
          ...response.user,
          token: response.token || response.user.token,
          storeId: credentials.storeId ? parseInt(credentials.storeId) : null,
          storeName: credentials.storeId ? selectedStore?.name : null
        };
        
        console.log('Kong Gateway login successful, setting user:', user);
        setUser(user);
      } else {
        setError('Invalid credentials. Please check your username and password.');
      }
    } catch (error) {
      console.error('Kong Gateway authentication error:', error);
      
      if (error.message.includes('401')) {
        setError('Invalid credentials. Please check your username and password.');
      } else if (error.message.includes('403')) {
        setError('Access denied. Your account may be disabled or lack permissions.');
      } else if (error.message.includes('502') || error.message.includes('503')) {
        setError('Authentication service is unavailable. Please try again later.');
      } else if (error.message.includes('404')) {
        setError('Authentication endpoint not found. Kong Gateway routing may be misconfigured.');
      } else {
        setError(`Login failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(120deg, #3f51b5 0%, #2196f3 100%)',
        p: 0,
        m: 0,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Fade in timeout={600}>
          <Card
            elevation={8}
            sx={{
              borderRadius: 3,
              minWidth: 340,
              maxWidth: 400,
              mx: 'auto',
              background: '#fff',
              boxShadow: 6,
              px: 2,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <LoginIcon sx={{ fontSize: 48, color: '#3f51b5', mb: 1 }} />
                <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
                  Store Retail Login
                </Typography>
                {/* Kong Status Indicator */}
                <Box sx={{ mt: 1 }}>
                  {kongStatus === 'loading' && (
                    <Typography variant="caption" color="info.main">
                       Connecting to Kong Gateway...
                    </Typography>
                  )}
                  {kongStatus === 'connected' && (
                    <Typography variant="caption" color="success.main">
                       Kong Gateway Connected
                    </Typography>
                  )}
                  {kongStatus === 'error' && (
                    <Typography variant="caption" color="error.main">
                       Kong Gateway Connection Failed
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Error Alert */}
              {error && (
                <Fade in>
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                </Fade>
              )}
              
              {/* Kong Gateway Required Warning */}
              {kongStatus === 'error' && (
                <Fade in>
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                    Kong Gateway is required for authentication. Please ensure:
                    <br />• Kong Gateway is running on localhost:8000
                    <br />• Backend services are running
                    <br />• CORS is properly configured
                  </Alert>
                </Fade>
              )}
              
              {/* Login Form */}
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  name="name"
                  value={credentials.name}
                  onChange={handleChange}
                  required
                  disabled={kongStatus !== 'connected'}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  disabled={kongStatus !== 'connected'}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  variant="outlined"
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Select Store (Required for Clients)</InputLabel>
                  <Select
                    name="storeId"
                    value={credentials.storeId}
                    onChange={handleChange}
                    label="Select Store (Required for Clients)"
                    disabled={kongStatus !== 'connected'}
                    startAdornment={<StoreIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    {stores.map((store) => (
                      <MenuItem key={store.id} value={store.id}>
                        {store.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || kongStatus !== 'connected'}
                  sx={{
                    py: 1.3,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    background: kongStatus === 'connected' 
                      ? 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)'
                      : 'linear-gradient(90deg, #9e9e9e 0%, #757575 100%)',
                    boxShadow: 2,
                    '&:hover': {
                      background: kongStatus === 'connected'
                        ? 'linear-gradient(90deg, #303f9f 0%, #1976d2 100%)'
                        : 'linear-gradient(90deg, #9e9e9e 0%, #757575 100%)',
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    <>
                      {kongStatus === 'connected' ? 'Sign In' : 'Kong Gateway Required'}
                    </>
                  )}
                </Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              {/* Infos Box */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Credentials
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Username: <strong>admin</strong> | Password: <strong>admin123</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Username: <strong>client</strong> | Password: <strong>client123</strong>
                </Typography>
              
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
}

export default Login;
