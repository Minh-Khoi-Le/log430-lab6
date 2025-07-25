/**
 * Product List Component
 * 
 * This component renders a grid of product cards.
 * It serves as a container for displaying multiple products in a responsive layout.
 * For clients, it can filter products by availability in their selected store.
 */

import React from "react";
import ProductCard from "./ProductCard";
import { Grid, Box, Typography } from "@mui/material";
import { useUser } from "../context/UserContext";

/**
 * ProductList Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.products - Array of product objects to display
 * @param {Function} props.onDelete - Optional handler for product deletion (for admin role)
 * @param {Function} props.onEdit - Optional handler for product editing (for admin role)
 * @param {boolean} props.hideUnavailable - Optional flag to hide products not available in client's store
 * @returns {JSX.Element} Grid of product cards
 */
const ProductList = ({
  products,
  onDelete,
  onEdit,
  hideUnavailable = false
}) => {
  const { user } = useUser();
  
  // For clients with hideUnavailable enabled, filter products by availability in their store
  let displayProducts = products || [];
  
  if (user?.role === "client" && hideUnavailable && user?.storeId) {
    displayProducts = products.filter(product => {
      const storeStock = product.stocks?.find(s => s.storeId === user.storeId);
      return storeStock && storeStock.quantity > 0;
    });
  }
  
  // Show empty state if no products are available
  if (!products || displayProducts.length === 0) {
    return (
      <Box sx={{ width: "100%", textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          {products && products.length > 0 
            ? "No products available in your selected store"
            : "No products available"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 4 }, py: 2, boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Responsive grid container for product cards */}
      <Grid container spacing={4} justifyContent="flex-start">
        {displayProducts.map((product) => (
          <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
            {/* Individual product card with edit/delete handlers */}
            <ProductCard
              product={product}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductList;
