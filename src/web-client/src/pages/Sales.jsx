/**
 * Sales Page
 * 
 * This page allows admin users to view and manage sales.
 * Kong API Gateway Integration:
 * - GET /sales -> transaction-service (requires authentication)
 */

import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { authenticatedFetch, API_ENDPOINTS } from '../api';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';

function Sales() {
  const { user } = useUser();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchSales();
    }
  }, [user]);

  const fetchSales = async () => {
    if (!user?.token) {
      setError('Authentication required to view sales data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching sales via Kong Gateway:', API_ENDPOINTS.SALES.BASE);
      const response = await authenticatedFetch(API_ENDPOINTS.SALES.BASE, user.token);
      const salesData = response.success ? response.data : response;
      setSales(Array.isArray(salesData) ? salesData : []);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sales via Kong Gateway:', err);
      if (err.message.includes('401')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('Access denied. You need admin permissions to view sales.');
      } else if (err.message.includes('502') || err.message.includes('503')) {
        setError('Sales service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to load sales data. Please try again.');
      }
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={50} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReceiptIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Sales Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          View and manage all sales transactions
        </Typography>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Sales Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sale ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Store</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                      No sales found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>#{sale.id}</TableCell>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell>{sale.user?.name || 'Unknown'}</TableCell>
                    <TableCell>{sale.store?.name || 'Unknown'}</TableCell>
                    <TableCell align="right">${sale.total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={sale.status || 'Active'} 
                        color={sale.status === 'refunded' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

export default Sales;
