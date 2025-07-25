/**
 * Products Page
 */

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../context/UserContext";
import { apiFetch, API_ENDPOINTS } from "../api";
import ProductList from "../components/ProductList";
import Modal from "../components/Modal";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

// Sample products data as fallback
const sampleProducts = [
  {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    price: 149.99,
    description:
      "Premium noise-cancelling wireless headphones with 30-hour battery life",
    category: "Electronics",
    stocks: [
      { storeId: 1, quantity: 0 },
      { storeId: 2, quantity: 5 },
      { storeId: 3, quantity: 3 },
    ],
  },
  {
    id: 2,
    name: "Smart Fitness Watch",
    price: 249.99,
    description: "Advanced fitness tracker with heart rate monitoring and GPS",
    category: "Electronics",
    stocks: [
      { storeId: 1, quantity: 0 },
      { storeId: 2, quantity: 2 },
      { storeId: 3, quantity: 7 },
    ],
  },
  {
    id: 3,
    name: "Coffee Maker",
    price: 89.99,
    description: "Programmable coffee maker with thermal carafe",
    category: "Home",
    stocks: [
      { storeId: 1, quantity: 12 },
      { storeId: 2, quantity: 8 },
      { storeId: 3, quantity: 0 },
    ],
  },
];

// --- ProductCreateForm component ---
function ProductCreateForm({ onSuccess, onCancel }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !price) {
      setError("Name and price are required.");
      return;
    }
    setLoading(true);
    try {
      const payload = { name, price: parseFloat(price), description };
      const res = await apiFetch(API_ENDPOINTS.PRODUCTS.BASE, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      console.log("Product creation response:", res);
      
      // Check for success more broadly - if we get any valid response with data
      if (res && (res.success !== false && (res.success || res.id || res.name || res.data || res.product))) {
        console.log("Product created successfully, calling onSuccess");
        onSuccess && onSuccess();
      } else {
        console.error("Product creation failed:", res);
        setError(res?.error || res?.message || "Failed to create product.");
      }
    } catch (err) {
      console.error("Error creating product:", err);
      setError("Failed to create product.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 320 }}
      >
        <TextField
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          inputProps={{ min: 0, step: 0.01 }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Product"}
          </Button>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </Box>
    </form>
  );
}

// --- ProductEditForm component ---
function ProductEditForm({ product, stores, onSuccess, onCancel }) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(product?.price || "");
  const [description, setDescription] = useState(product?.description || "");
  // Ensure all stores are represented in stocks, even if quantity is 0
  const getAllStocks = (productStocks, stores) => {
    return stores.map((store) => {
      const found = productStocks?.find((s) => s.storeId === store.id);
      return found ? { ...found } : { storeId: store.id, quantity: 0 };
    });
  };
  const [stocks, setStocks] = useState(
    getAllStocks(product?.stocks || [], stores)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update stocks when stores or product changes
  useEffect(() => {
    setStocks(getAllStocks(product?.stocks || [], stores));
  }, [product, stores]);

  // Handle stock quantity change
  const handleStockChange = (storeId, value) => {
    setStocks((stocks) =>
      stocks.map((s) =>
        s.storeId === storeId ? { ...s, quantity: Number(value) } : s
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !price) {
      setError("Name and price are required.");
      return;
    }
    setLoading(true);
    try {
      // Update product fields
      await apiFetch(API_ENDPOINTS.PRODUCTS.BY_ID(product.id), {
        method: "PUT",
        body: JSON.stringify({ name, price: parseFloat(price), description }),
        headers: { "Content-Type": "application/json" },
      });
      
      // Get current stock data to find existing stock IDs
      const currentStockResponse = await apiFetch(API_ENDPOINTS.STOCK.BY_PRODUCT(product.id));
      const currentStockData = currentStockResponse.data || currentStockResponse || [];
      
      console.log("Current stock data:", currentStockData);
      console.log("Stocks to update:", stocks);
      
      // Update each stock record
      await Promise.all(
        stocks.map(async (stock) => {
          // Find existing stock record by storeId and productId
          const existingStock = currentStockData.find(
            (s) => s.storeId === stock.storeId && s.productId === product.id
          );
          
          if (existingStock) {
            // Update existing stock using the stock ID
            console.log(`Updating stock ID ${existingStock.id} with quantity ${stock.quantity}`);
            return apiFetch(API_ENDPOINTS.STOCK.BY_ID(existingStock.id), {
              method: "PUT",
              body: JSON.stringify({ quantity: stock.quantity }),
              headers: { "Content-Type": "application/json" },
            });
          } else {
            // Create new stock record if it doesn't exist
            console.log(`Creating new stock for store ${stock.storeId} with quantity ${stock.quantity}`);
            return apiFetch(API_ENDPOINTS.STOCK.BASE, {
              method: "POST",
              body: JSON.stringify({
                productId: product.id,
                storeId: stock.storeId,
                quantity: stock.quantity,
              }),
              headers: { "Content-Type": "application/json" },
            });
          }
        })
      );
      
      onSuccess && onSuccess();
    } catch (err) {
      console.error("Error updating product or stock:", err);
      setError("Failed to update product or stock.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 320 }}
      >
        <TextField
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          inputProps={{ min: 0, step: 0.01 }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
        />
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Stock by Store</Typography>
          {stocks.map((stock) => (
            <Box
              key={stock.storeId}
              sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
            >
              <Typography sx={{ minWidth: 120 }}>
                {stores.find((s) => s.id === stock.storeId)?.name ||
                  `Store ${stock.storeId}`}
                :
              </Typography>
              <TextField
                type="number"
                value={stock.quantity}
                onChange={(e) =>
                  handleStockChange(stock.storeId, e.target.value)
                }
                inputProps={{ min: 0, step: 1 }}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
          ))}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </Box>
    </form>
  );
}

function Products() {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [stores, setStores] = useState([]);
  const [sortBy, setSortBy] = useState("stock"); // Default to 'stock' for available stock sorting
  const [sortOrder, setSortOrder] = useState("desc"); // Default to 'desc' for descending order

  // Get selected storeId from user context or default to first store
  const selectedStoreId = user?.storeId || (stores[0]?.id ?? null);

  // Define fetchProducts before useEffect hooks
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Fetching products...");

      // Fetch both products and stock data in parallel
      try {
        const [productsResponse, stockResponse] = await Promise.all([
          apiFetch(API_ENDPOINTS.PRODUCTS.BASE),
          apiFetch(API_ENDPOINTS.STOCK.BASE),
        ]);

        console.log("Products response:", productsResponse);
        console.log("Stock response:", stockResponse);

        const productsData = productsResponse.success
          ? productsResponse.data
          : productsResponse;
        const products = productsData.products || productsData;

        const stockData = stockResponse.success
          ? stockResponse.data
          : stockResponse;
        const inventory = stockData.inventory || stockData;

        console.log("Parsed products:", products);
        console.log("Parsed inventory:", inventory);

        if (Array.isArray(products) && products.length > 0) {
          // Merge stock data with products
          const productsWithStock = products.map((product) => {
            // Find all stock entries for this product across all stores
            const productStocks = Array.isArray(inventory)
              ? inventory.filter((stock) => stock.productId === product.id)
              : [];

            return {
              ...product,
              stocks: productStocks,
            };
          });

          console.log("Products with stock:", productsWithStock);
          setProducts(productsWithStock);
        } else {
          console.log("No products from API, using sample data");
          // Fallback to sample data if no products from API
          setProducts(sampleProducts);
        }
      } catch (apiError) {
        console.error("API Error, using sample data:", apiError);
        // Use sample data as fallback
        setProducts(sampleProducts);
      }

      setLoading(false);
    } catch (error) {
      setError("Failed to load products. Please try again.");
      console.error("Error fetching products:", error);
      setProducts(sampleProducts); // Fallback to sample data
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, sortBy, sortOrder]);

  // Listen for stock updates from cart purchases
  useEffect(() => {
    const handleStockUpdate = (event) => {
      console.log("Stock update event received:", event.detail);
      // Refetch products to get updated stock information
      fetchProducts();
    };

    window.addEventListener("stockUpdated", handleStockUpdate);

    return () => {
      window.removeEventListener("stockUpdated", handleStockUpdate);
    };
  }, [fetchProducts]);

  const filterProducts = () => {
    let filtered = products;
    
    console.log("Filtering products:", { 
      totalProducts: products.length, 
      searchTerm, 
      selectedCategory, 
      sortBy, 
      sortOrder 
    });

    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Sorting logic
    filtered = filtered.slice().sort((a, b) => {
      let aValue, bValue;
      if (sortBy === "name") {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      } else if (sortBy === "price") {
        aValue = a.price;
        bValue = b.price;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      } else if (sortBy === "stock") {
        // Sort by available stock for the selected store only
        const aStock = Array.isArray(a.stocks)
          ? (a.stocks.find(s => s.storeId === selectedStoreId)?.quantity || 0)
          : 0;
        const bStock = Array.isArray(b.stocks)
          ? (b.stocks.find(s => s.storeId === selectedStoreId)?.quantity || 0)
          : 0;
        return sortOrder === "asc" ? aStock - bStock : bStock - aStock;
      }
      return 0;
    });

    console.log("Filtered products:", filtered);
    setFilteredProducts(filtered);
  };

  const handleEditProduct = (product) => {
    setProductToEdit(product);
    setEditDialogOpen(true);
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(API_ENDPOINTS.PRODUCTS.BY_ID(productToDelete.id), {
        method: "DELETE",
      });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      setError("Failed to delete product.");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
    setLoading(false);
  };

  // Fetch stores for stock editing
  const fetchStores = useCallback(async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.STORES.BASE);
      setStores(res.data || res || []);
    } catch (e) {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    if (editDialogOpen) fetchStores();
  }, [editDialogOpen, fetchStores]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress size={50} />
        </Box>
      </Container>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f6f6",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Header with title and filters */}
      <Paper elevation={1} sx={{ mx: 4, mt: 4, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h6">Product Catalog</Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => {
                console.log("Manual refresh triggered");
                fetchProducts();
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setShowAddModal(true)}
              >
                Add Product
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main content area with product listing */}
      <div
        style={{
          margin: "20px 28px 0 28px",
          padding: "20px 0",
          minHeight: "60vh",
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              my: 4,
              gap: 2,
            }}
          >
            <CircularProgress size={50} />
            <Typography>Loading products...</Typography>
            {error && (
              <Typography variant="body2" color="text.secondary">
                Retrying connection...
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
                  <TextField
                    select
                    label="Sort By"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    size="small"
                    SelectProps={{ native: true }} 
                    sx={{ minWidth: 140 }}
                  >
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="stock">Available Stock</option>
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? "Asc" : "Desc"}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Product List */}
            <ProductList
              products={filteredProducts}
              onEdit={user?.role === "admin" ? handleEditProduct : undefined}
              onDelete={
                user?.role === "admin" ? handleDeleteProduct : undefined
              }
              userRole={user?.role}
            />
          </>
        )}
      </div>

      {/* Add Product Modal */}
      {user?.role === "admin" && (
        <Modal
          open={showAddModal}
          title="Add New Product"
          onClose={() => setShowAddModal(false)}
          onConfirm={async () => {
            // No-op, handled in form
          }}
        >
          <ProductCreateForm
            onSuccess={async () => {
              console.log("Product created successfully, refreshing list");
              setShowAddModal(false);
              // Add a small delay to ensure the API has processed the creation
              await new Promise(resolve => setTimeout(resolve, 100));
              // Force refresh the products list
              await fetchProducts();
            }}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}

      {/* Edit Product Modal */}
      {user?.role === "admin" && (
        <Modal
          open={editDialogOpen}
          title="Edit Product"
          onClose={() => setEditDialogOpen(false)}
          onConfirm={null}
        >
          {productToEdit && (
            <ProductEditForm
              product={productToEdit}
              stores={stores}
              onSuccess={() => {
                setEditDialogOpen(false);
                setProductToEdit(null);
                fetchProducts();
              }}
              onCancel={() => {
                setEditDialogOpen(false);
                setProductToEdit(null);
              }}
            />
          )}
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <b>{productToDelete?.name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteProduct}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Products;
