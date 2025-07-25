/**
 * Product Card Component
 * 
 * This component displays a single product in a card format.
 * It adapts its functionality based on the user's role:
 * - For clients: Shows add to cart button and store-specific stock
 * - For managers: Shows edit, delete buttons and total stock across all stores
 */

import React from "react";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  IconButton,
  Tooltip,
  Fade,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";

const ProductCard = ({ product, onEdit, onDelete }) => {
  // State for hover effects
  const [hover, setHover] = React.useState(false);
  const { addToCart } = useCart();
  const { user } = useUser();
  
  // Calculate total stock across all stores (for manager)
  const totalStock = product.stocks
    ? product.stocks.reduce((sum, s) => sum + s.quantity, 0)
    : 0;
    
  // Get stock for the current store (for client)
  const currentStoreStock = product.stocks && user?.storeId
    ? product.stocks.find(s => s.storeId === user.storeId)?.quantity || 0
    : 0;
    
  // Determine which stock value to display based on user role
  const displayStock = user?.role === "admin" ? totalStock : currentStoreStock;
  const stockLabel = user?.role === "admin" ? "Total stock" : "Available stock";

  // Check if user is a client for conditional rendering
  const isClient = user?.role === "client";

  return (
    <Card
      sx={{
        width: 270,
        minHeight: 190,
        margin: 2,
        borderRadius: 3,
        boxShadow: hover ? 8 : 2,
        transition: "box-shadow 0.2s",
        position: "relative",
        overflow: "visible",
        "&:hover": {
          boxShadow: 12,
        },
        background: "#f8fafd"
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="product-card"
    >
      {/* Card content with product details */}
      <CardContent sx={{ pb: 1 }}>
        {/* Product name and price header */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {product.name}
          </Typography>
          <Typography variant="h6">${product.price.toFixed(2)}</Typography>
        </Box>
        
        {/* Stock availability information */}
        <Typography
          variant="body2"
          sx={{ 
            color: displayStock > 0 ? "#3577d6" : "#d32f2f", 
            mt: 0.5, 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isClient && <StorefrontIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />}
          {stockLabel}&nbsp;: <b>{displayStock}</b>
        </Typography>
        
        {/* Product description (short version) */}
        {product.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ 
              mt: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical"
            }}
          >
            {product.description}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", pt: 0 }}>
        {/* Admin actions: Edit and Delete buttons (only shown for manager role) */}
        <Fade in={hover && (!!onEdit || !!onDelete)}>
          <Box>
            {/* Edit button */}
            {onEdit && (
              <Tooltip title="Edit" placement="top" arrow>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {/* Delete button */}
            {onDelete && (
              <Tooltip title="Delete" placement="top" arrow>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(product);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Fade>
        
        {/* Client action: Add to cart button (only shown for client role) */}
        {isClient && (
          <Box sx={{ width: "100%" }}>
            <Button
              variant="contained"
              startIcon={<AddShoppingCartIcon />}
              onClick={() => addToCart(product)}
              disabled={currentStoreStock === 0}
              sx={{
                backgroundColor: currentStoreStock === 0 ? "#bdbdbd" : "#208aff",
                color: "#fff",
                borderRadius: 2,
                fontWeight: 700,
                ml: "auto",
                boxShadow: "none",
                ":hover": { background: "#1566c4" },
                width: "100%"
              }}
              fullWidth
            >
              {currentStoreStock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </Box>
        )}
      </CardActions>
    </Card>
  );
};

export default ProductCard;
