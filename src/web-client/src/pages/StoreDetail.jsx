/**
 * Store Detail Page
 * 
 * This component provides detailed information about a specific store,
 * including stock levels, recent sales, and store management features.
 * Intended for use by managers
 * Kong API Gateway Integration:
 * - GET /stores/{id} -> catalog-service (public)
 * - GET /stock/store/{id} -> catalog-service (requires authentication)
 * - GET /sales/store/{id} -> transaction-service (requires authentication)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiFetch, authenticatedFetch, API_ENDPOINTS } from "../api";
import { 
  Box, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import StoreIcon from '@mui/icons-material/Store';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';

function StoreDetail() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  
  // State variables
  const [store, setStore] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch store data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Function to fetch store details
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Fetching store details via Kong Gateway');
        
        // Fetch store details (public endpoint)
        const storeData = await apiFetch(API_ENDPOINTS.STORES.BY_ID(storeId));
        setStore(storeData.success ? storeData.data : storeData);
        
        // For authenticated data, check if user is logged in
        if (user?.token) {
          try {
            // Fetch store stock (requires authentication)
            const stockData = await authenticatedFetch(API_ENDPOINTS.STOCK.BY_STORE(storeId), user.token);
            setStocks(stockData.success ? stockData.data : stockData);
            
            // Fetch recent sales (requires authentication)
            const salesData = await authenticatedFetch(`${API_ENDPOINTS.SALES.BASE}/store/${storeId}?limit=10`, user.token);
            setSales(salesData.success ? salesData.data : salesData);
          } catch (authErr) {
            console.warn('Could not fetch authenticated store data:', authErr);
            // Set empty arrays for stock and sales if auth fails
            setStocks([]);
            setSales([]);
            if (authErr.message.includes('403') || authErr.message.includes('401')) {
              console.warn('User lacks permissions for stock/sales data or authentication failed');
            }
          }
        } else {
          // No user logged in, set empty arrays
          setStocks([]);
          setSales([]);
          console.log('No user token available, skipping stock and sales data');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching store data via Kong Gateway:', err);
        if (err.message.includes('404')) {
          setError('Store not found');
        } else if (err.message.includes('502') || err.message.includes('503')) {
          setError('Store service is temporarily unavailable. Please try again later.');
        } else {
          setError(err.message);
        }
        setLoading(false);
      }
    };
    
    fetchStoreData();
  }, [storeId]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error message if there was a problem
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error}
          <Button 
            variant="outlined" 
            sx={{ ml: 2 }} 
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
      {/* Store header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <StoreIcon sx={{ fontSize: 40, color: '#3a8bff', mr: 2 }} />
          <Typography variant="h4" component="h1">
            {store?.name}
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          {store?.address || 'Address not specified'}
        </Typography>
        
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }} 
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Paper>

      {/* Tab navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<InventoryIcon />} label="Stock" />
          <Tab icon={<ReceiptIcon />} label="Recent Sales" />
        </Tabs>
      </Paper>

      {/* Stock tab content */}
      {activeTab === 0 && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Store Inventory
          </Typography>
          
          {stocks.length === 0 ? (
            <Alert severity="info">No products in stock</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="right"><strong>Price</strong></TableCell>
                    <TableCell align="right"><strong>Quantity</strong></TableCell>
                    <TableCell align="right"><strong>Total Value</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stocks.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell>{item.product?.description || '—'}</TableCell>
                      <TableCell align="right">${item.product?.price?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Box component="span" sx={{
                          fontWeight: 'bold',
                          color: item.quantity < 10 ? 'error.main' : 'inherit'
                        }}>
                          {item.quantity}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        ${(item.quantity * (item.product?.price || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Sales tab content */}
      {activeTab === 1 && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Sales
          </Typography>
          
          {sales.length === 0 ? (
            <Alert severity="info">No recent sales</Alert>
          ) : (
            <Stack spacing={2}>
              {sales.map((sale) => (
                <Paper 
                  elevation={2} 
                  key={sale.id} 
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 4
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#f8f9fa', 
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      Sale #{sale.id}
                    </Typography>
                    <Chip 
                      label={`Total: ${sale.total?.toFixed(2)} $`}
                      color="primary"
                      icon={<ReceiptIcon />}
                    />
                  </Box>
                  
                  <Box sx={{ px: 2, py: 1, display: "flex", gap: 3, bgcolor: '#f8f9fa', flexWrap: 'wrap' }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <CalendarTodayIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(sale.date)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PersonIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {sale.user?.name || 'Unknown Customer'}
                      </Typography>
                    </Box>

                    {sale.status && sale.status !== 'active' && (
                      <Chip 
                        size="small"
                        label={sale.status === 'refunded' ? 'Refunded' : 'Partially Refunded'}
                        color={sale.status === 'refunded' ? 'error' : 'warning'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Divider />
                  
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Sold Items:
                    </Typography>
                    <List disablePadding>
                      {sale.lines?.map((line) => (
                        <ListItem 
                          key={line.id} 
                          disablePadding 
                          sx={{ 
                            py: 1,
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {line.product?.name || 'Unknown Product'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ${((line.quantity || 0) * (line.unitPrice || 0)).toFixed(2)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {line.quantity} x ${line.unitPrice?.toFixed(2)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default StoreDetail;
