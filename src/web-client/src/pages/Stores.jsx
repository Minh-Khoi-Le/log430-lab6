/**
 * Stores Page
 * 
 * This page allows admin users to view and manage stores.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_ENDPOINTS } from '../api';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Store as StoreIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

function Stores() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiFetch(API_ENDPOINTS.STORES.BASE);
      const data = response.success ? response.data : response;
      setStores(Array.isArray(data) ? data : []);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Failed to load stores.');
      setLoading(false);
    }
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
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StoreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" fontWeight="600">
              Store Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              View and manage all stores in the system
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <StoreIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No stores found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no stores in the system yet.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {stores.map((store) => (
            <Grid item xs={12} sm={6} md={4} key={store.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StoreIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      {store.name}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {store.address || 'No address specified'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    Store ID: {store.id}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/stores/${store.id}`)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default Stores;
