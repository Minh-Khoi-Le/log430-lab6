/**
 * Refunds Page
 * 
 * This page allows admin users to view and manage refunds.
 * Kong API Gateway Integration:
 * - GET /refunds -> transaction-service (requires authentication)
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
import { Assignment as RefundIcon } from '@mui/icons-material';

function Refunds() {
  const { user } = useUser();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchRefunds();
    }
  }, [user]);

  const fetchRefunds = async () => {
    if (!user?.token) {
      setError('Authentication required to view refunds data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching refunds via Kong Gateway:', API_ENDPOINTS.REFUNDS.BASE);
      const response = await authenticatedFetch(API_ENDPOINTS.REFUNDS.BASE, user.token);
      
      // Handle the new shared database structure
      let refundsData = [];
      if (response) {
        if (Array.isArray(response)) {
          refundsData = response;
        } else if (response.data && Array.isArray(response.data)) {
          refundsData = response.data;
        }
      }
      
      setRefunds(refundsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching refunds via Kong Gateway:', err);
      if (err.message.includes('401')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('Access denied. You need admin permissions to view refunds.');
      } else if (err.message.includes('502') || err.message.includes('503')) {
        setError('Refunds service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to load refunds data. Please try again.');
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
          <RefundIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Refunds Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          View and manage all refund requests
        </Typography>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Refunds Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Refund ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Original Sale</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                      No refunds found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => {
                  return (
                  <TableRow key={refund.id}>
                    <TableCell>#{refund.id}</TableCell>
                    <TableCell>{formatDate(refund.date)}</TableCell>
                    <TableCell>#{refund.saleId}</TableCell>
                    <TableCell>{refund.user?.name || refund.customerName || 'Unknown'}</TableCell>
                    <TableCell align="right">${refund.total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={refund.status || 'Completed'} 
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {refund.reason || 'No reason provided'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

export default Refunds;
