/**
 * Product Edit Form Component
 * 
 * This component provides a form for editing product details.
 * It's used by managers to modify product information.
 * 
 */

import React, { useState, useEffect } from "react";
import { apiFetch, API_ENDPOINTS } from "../api";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  TextField,
  Typography,
  Box,
  Button,
  CircularProgress
} from "@mui/material";

/**
 * ProductEditForm Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.product - Product object to edit
 * @param {Function} props.onSave - Handler function called when save button is clicked
 * @param {Function} props.onCancel - Handler function called when cancel button is clicked
 * @param {boolean} [props.isNewProduct] - Whether this form is for creating a new product
 * @returns {JSX.Element} Product edit form
 */
const ProductEditForm = ({ product, onSave, onCancel, isNewProduct = false }) => {
  // Local state for form fields to enable controlled inputs
  const [form, setForm] = useState({ 
    name: "",
    price: 0,
    description: ""
  });
  
  // State for stock quantities by store
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  
  // Get user from context (for future authentication needs)
  // const { user } = useUser();

  // Initialize form with product data when component mounts or product changes
  useEffect(() => {
    if (product) {
      // Set base product data
      setForm({
        name: product.name || "",
        price: product.price || 0,
        description: product.description || ""
      });
      
      // Fetch stock information for existing products
      if (product.id && !isNewProduct) {
        fetchStockData(product.id);
      }
    }
  }, [product, isNewProduct]);
  
  // Fetch stock data for this product
  const fetchStockData = async (productId) => {
    try {
      setStockLoading(true);
      
      // First fetch all stores
      const storesResponse = await apiFetch(API_ENDPOINTS.STORES.BASE);
      const stores = storesResponse.success ? storesResponse.data : storesResponse;
      
      // Then fetch current stock data for this product
      const stockResponse = await apiFetch(API_ENDPOINTS.STOCK.BY_PRODUCT(productId));
      const stocks = stockResponse.success ? stockResponse.data : stockResponse;
      
      // If we have no stock data, initialize with 0 quantity for each store
      if (!stocks || stocks.length === 0) {
        const initialStocks = stores.map(store => ({
          id: `temp_${store.id}`,
          storeId: store.id,
          store: store,
          productId: productId,
          quantity: 0
        }));
        setStocks(initialStocks);
      } else {
        // Make sure every store has a stock entry
        const stockMap = new Map(stocks.map(s => [s.storeId, s]));
        
        const completeStocks = stores.map(store => {
          const existingStock = stockMap.get(store.id);
          if (existingStock) {
            return {
              ...existingStock,
              store
            };
          } else {
            return {
              id: `temp_${store.id}`,
              storeId: store.id,
              store: store,
              productId: productId,
              quantity: 0
            };
          }
        });
        
        setStocks(completeStocks);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setStockLoading(false);
    }
  };

  /**
   * Handle input field changes for product details
   * Updates the form state when any input value changes
   * 
   * @param {Event} e - Input change event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Handle stock quantity change
   * Updates the stock quantity for a specific store
   * 
   * @param {number} stockId - Stock ID
   * @param {number} value - New quantity value
   */
  const handleStockChange = (stockIndex, value) => {
    const updatedStocks = [...stocks];
    updatedStocks[stockIndex].quantity = parseInt(value) || 0;
    setStocks(updatedStocks);
  };
  
  /**
   * Save stock changes
   * Updates stock quantities on the server
   */
  const saveStockChanges = async () => {
    try {
      setLoading(true);
      
      // Save stock changes for each store
      const promises = stocks.map(stock => 
        apiFetch(API_ENDPOINTS.STOCK.UPDATE, {
          method: 'PUT',
          body: JSON.stringify({
            productId: product.id,
            storeId: stock.storeId,
            quantity: stock.quantity || 0
          })
        })
      );
      
      await Promise.all(promises);
      
      // Refresh stock data
      await fetchStockData(product.id);
    } catch (error) {
      console.error("Error saving stock changes:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission
   * Validates inputs and calls the onSave handler with updated product data
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate required fields
    if (!form.name || form.price === "") {
      alert("Name and price are required!");
      return;
    }
    
    // Prepare product data
    const productData = {
      ...(isNewProduct ? {} : { id: product.id }),
      name: form.name,
      price: parseFloat(form.price),
      description: form.description
    };
    
    // Call save handler with product data
    onSave(productData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 600 }}>
      {/* Product name field */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          value={form.name || ""}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
          required
          placeholder="Product name"
        />
      </div>
      
      {/* Product price field */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="price">Price ($)</label>
        <input
          id="price"
          name="price"
          type="number"
          value={form.price || ""}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginTop: 4 }}
          required
          placeholder="Product price"
          step="0.01"
          min="0"
        />
      </div>
      
      {/* Product description field */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={form.description || ""}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, minHeight: 100, marginTop: 4, resize: "vertical" }}
          placeholder="Product description (optional)"
        />
      </div>
      
      {/* Stock management section (only for existing products) */}
      {!isNewProduct && (
        <div style={{ marginTop: 24 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Stock Levels</Typography>
            <Button 
              variant="contained" 
              size="small" 
              onClick={saveStockChanges}
              disabled={stockLoading || loading}
            >
              {loading ? <CircularProgress size={20} /> : "Update Stock"}
            </Button>
          </Box>
          
          {stockLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Store</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stocks.map((stock, index) => (
                    <TableRow key={stock.id}>
                      <TableCell>{stock.store?.name}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={stock.quantity}
                          onChange={(e) => handleStockChange(index, e.target.value)}
                          InputProps={{ 
                            inputProps: { 
                              min: 0, 
                              style: { textAlign: 'right', width: '60px' } 
                            } 
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      )}
      
      {/* Form actions */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" type="submit">
          {isNewProduct ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default ProductEditForm;
