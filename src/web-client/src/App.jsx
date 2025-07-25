import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Dashboard from "./pages/Dashboard";
import Stores from "./pages/Stores";
import Sales from "./pages/Sales";
import Refunds from "./pages/Refunds";
import Inventory from "./pages/Inventory";
import CartPage from "./pages/CartPage";
import History from "./pages/History";
import StoreDetail from "./pages/StoreDetail";
import Navbar from "./components/Navbar";
import { useUser } from "./context/UserContext";
import './App.css'

/**
 * MainApp Component
 * 
 * Handles the main application logic including:
 * - Authentication state management
 * - Conditional routing based on user role
 * - Shopping cart state management
 * 
 * If no user is authenticated, it displays the login page.
 * Otherwise, it shows the appropriate routes based on user role.
 */
function MainApp() {
  const { user } = useUser();

  // If no user is authenticated, show login page
  if (!user) {
    return <Login />;
  }

  // Debug logging
  console.log('Current user:', user);
  console.log('User role:', user.role);

  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Product catalog - default route for all users */}
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<Products />} />
        
        {/* Routes for admin role only */}
        {user.role === "admin" && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/stores/:storeId" element={<StoreDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/refunds" element={<Refunds />} />
          </>
        )}
        
        {/* Routes for client role only */}
        {user.role === "client" && (
          <>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/history" element={<History />} />
          </>
        )}
        
        {/* Redirect all other routes to products */}
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </Router>
  );
}

export default MainApp;
