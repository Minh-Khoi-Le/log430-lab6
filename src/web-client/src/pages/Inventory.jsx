/**
 * Inventory Page
 * 
 * This page allows admin users to view and manage inventory across all stores.
 * Kong API Gateway Integration:
 * - GET /products -> catalog-service (requires authentication)
 * - GET /stock/product/{id} -> catalog-service (requires authentication)
 * - PUT /stock/update -> catalog-service (requires authentication)
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
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Inventory as InventoryIcon, Edit as EditIcon } from '@mui/icons-material';

function Inventory() {
  const { user } = useUser();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, item: null });
  const [newQuantity, setNewQuantity] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchInventory();
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user?.token) {
      setError('Authentication required to view inventory data.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching inventory via Kong Gateway');
      // Fetch all products and their stock levels
      const productsResponse = await authenticatedFetch(API_ENDPOINTS.PRODUCTS.BASE, user.token);
      const products = productsResponse.success ? productsResponse.data : productsResponse;
      
      // For each product, fetch stock across all stores
      const inventoryData = [];
      for (const product of products) {
        const stockResponse = await authenticatedFetch(API_ENDPOINTS.STOCK.BY_PRODUCT(product.id), user.token);
        const stocks = stockResponse.success ? stockResponse.data : stockResponse;
        
        if (Array.isArray(stocks)) {
          stocks.forEach(stock => {
            inventoryData.push({
              ...stock,
              product
            });
          });
        }
      }
      
      setInventory(inventoryData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching inventory via Kong Gateway:', err);
      if (err.message.includes('401')) {
        setError('Authentication failed. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('Access denied. You need admin permissions to view inventory.');
      } else if (err.message.includes('502') || err.message.includes('503')) {
        setError('Inventory service is temporarily unavailable. Please try again later.');
      } else {
        setError('Failed to load inventory data. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleEditStock = (item) => {
    setEditDialog({ open: true, item });
    setNewQuantity(item.quantity.toString());
  };

  const handleSaveStock = async () => {
    if (!user?.token) {
      setError('Authentication required to update stock.');
      return;
    }

    try {
      await authenticatedFetch(API_ENDPOINTS.STOCK.UPDATE, user.token, {
        method: 'PUT',
        body: JSON.stringify({
          productId: editDialog.item.productId,
          storeId: editDialog.item.storeId,
          quantity: parseInt(newQuantity) || 0
        })
      });
      
      setEditDialog({ open: false, item: null });
      fetchInventory(); // Refresh data
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Failed to update stock level.');
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'error' };
    if (quantity < 10) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
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
          <InventoryIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Inventory Management
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          View and manage stock levels across all stores
        </Typography>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Inventory Table */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Store</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                      No inventory data found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const status = getStockStatus(item.quantity);
                  return (
                    <TableRow key={`${item.productId}-${item.storeId}`}>
                      <TableCell>
                        <Typography variant="subtitle2">{item.product?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.description}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.store?.name || 'Unknown Store'}</TableCell>
                      <TableCell align="right">${item.product?.price?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={item.quantity < 10 ? 'bold' : 'normal'}>
                          {item.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={status.label} 
                          color={status.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditStock(item)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Stock Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, item: null })}>
        <DialogTitle>Edit Stock Level</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Update stock quantity for <strong>{editDialog.item?.product?.name}</strong>{' '}
            at <strong>{editDialog.item?.store?.name}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            variant="outlined"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, item: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveStock} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Inventory;
