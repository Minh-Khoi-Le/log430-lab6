/**
 * Cart Page
 * 
 * This component displays the shopping cart and handles the checkout process.
 * It's only accessible to users with the client role.
 * 
 */

import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useUser } from "../context/UserContext";
import { apiFetch, API_ENDPOINTS } from "../api";
import Modal from "../components/Modal";

const CartPage = () => {
  const { cart: rawCart, removeFromCart, clearCart } = useCart();
  const cart = Array.isArray(rawCart) ? rawCart : [];
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Calculate total price of all items in cart
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  /**
   * Handle checkout process
   * 
   * Submits the cart contents to the backend to create a new sale.
   * Updates UI state during the process and handles success/failure.
   */
  const handleCheckout = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      // Send cart data to backend API via API Gateway
      const data = await apiFetch(API_ENDPOINTS.SALES.CREATE, {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          storeId: user.storeId,
          lines: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price
          }))
        })
      });
      
      setLoading(false);

      // Handle API response - if we get here without an error, the sale was successful
      // Save receipt data and show the receipt modal
      setReceiptData({
        date: new Date().toLocaleString(),
        items: [...cart],
        total: total,
        saleId: data.id || data.sale?.id || data.data?.id || 'N/A',
        storeName: user.storeName,
        userName: user.name
      });
      setShowReceipt(true);
      clearCart();
      setErrorMsg("");
      
      // Trigger a page refresh to update product stock information
      // This ensures that the Products page will show updated stock levels
      setTimeout(() => {
        console.log('Dispatching stockUpdated event...');
        const productIds = cart.map(item => item.product.id);
        console.log('Products affected by sale:', productIds);
        
        // Dispatch a custom event that the Products page can listen to
        window.dispatchEvent(new CustomEvent('stockUpdated', { 
          detail: { productIds }
        }));
        
        console.log('stockUpdated event dispatched successfully');
      }, 1000); // Small delay to ensure the sale is processed
    } catch (err) {
      console.error("Error confirming purchase:", err);
      
      // Extract error message from API error response
      let errorMessage = "Network or server error.";
      if (err.message) {
        // Check if the error message contains "API Error" format
        const apiErrorMatch = err.message.match(/API Error \d+: (.+)/);
        if (apiErrorMatch) {
          try {
            // Try to parse the error as JSON to get the message
            const errorData = JSON.parse(apiErrorMatch[1]);
            errorMessage = errorData.message || errorData.error || apiErrorMatch[1];
          } catch {
            // If parsing fails, use the raw error message
            errorMessage = apiErrorMatch[1];
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      setErrorMsg(errorMessage);
      setLoading(false);
    }
  };

  /**
   * Close receipt modal and redirect to main product page
   */
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    window.location.href = "/";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: '100vw',
        overflowX: 'hidden',
        background: "#f6f6f6",
        fontFamily: "Inter, Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 60
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: "#fff",
          padding: 36,
          borderRadius: 18,
          boxShadow: "0 6px 32px #23314622, 0 1.5px 10px #ccc2",
        }}
      >
        {/* Cart title */}
        <h2
          style={{
            fontWeight: 700,
            fontSize: "2.2rem",
            textAlign: "center",
            marginBottom: 28,
            color: "#223"
          }}
        >Your Cart</h2>
        
        {/* Empty cart message */}
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", fontSize: 20, marginTop: 30 }}>Cart is empty.</div>
        ) : (
          <>
            {/* Cart item list */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cart.map((item) => (
                <li
                  key={item.product.id}
                  style={{
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #e4e4e4",
                    paddingBottom: 7,
                    fontSize: 18,
                    color: "#222",
                    fontWeight: 500,
                  }}
                >
                  {/* Item details */}
                  <span>
                    <span style={{ fontWeight: 700 }}>{item.product.name}</span>
                    &nbsp;x {item.quantity}
                    <span style={{ color: "#6070FF", fontWeight: 400 }}>
                      &nbsp;-&nbsp;${item.product.price.toFixed(2)}
                    </span>
                  </span>
                  
                  {/* Remove item button */}
                  <button
                    style={{
                      padding: "7px 17px",
                      background: "#f7f8fc",
                      color: "#2a3557",
                      border: "1.5px solid #c8c8e8",
                      borderRadius: 25,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 15,
                      transition: "background 0.16s, color 0.12s, border 0.16s",
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = "#f44336";
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.border = "1.5px solid #f44336";
                    }}
                    onFocus={e => {
                      e.currentTarget.style.background = "#f44336";
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.border = "1.5px solid #f44336";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = "#f7f8fc";
                      e.currentTarget.style.color = "#2a3557";
                      e.currentTarget.style.border = "1.5px solid #c8c8e8";
                    }}
                    onBlur={e => {
                      e.currentTarget.style.background = "#f7f8fc";
                      e.currentTarget.style.color = "#2a3557";
                      e.currentTarget.style.border = "1.5px solid #c8c8e8";
                    }}
                    onClick={() => removeFromCart(item.product.id)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            
            {/* Cart total */}
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                marginTop: 30,
                marginBottom: 22,
                textAlign: "right",
                color: "#29306b"
              }}
            >
              Total: <span style={{ color: "#376dff" }}>${total.toFixed(2)}</span>
            </div>
            
            {/* Error message display */}
            {errorMsg && (
              <div style={{ color: "#f44336", fontWeight: 600, marginBottom: 14 }}>{errorMsg}</div>
            )}
            
            {/* Checkout button */}
            <button
              style={{
                margin: "24px auto 0 auto",
                display: "block",
                width: "100%",
                padding: "14px 20px",
                background: "#4568dc",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? "Processing..." : "Checkout"}
            </button>
          </>
        )}
        
        {/* Receipt modal */}
        {showReceipt && receiptData && (
          <Modal onClose={handleCloseReceipt} open={showReceipt}>
            <div style={{ padding: "20px 30px", maxWidth: 500 }}>
              <h2 style={{ textAlign: "center", marginBottom: 20 }}>Purchase Receipt</h2>
              <div style={{ marginBottom: 10 }}>
                <strong>Date:</strong> {receiptData.date}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Sale ID:</strong> {receiptData.saleId}
              </div>
              <div style={{ marginBottom: 10 }}>
                <strong>Customer:</strong> {receiptData.userName}
              </div>
              <div style={{ marginBottom: 20 }}>
                <strong>Store:</strong> {receiptData.storeName}
              </div>
              <h3 style={{ borderBottom: "1px solid #ddd", paddingBottom: 5 }}>Items:</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {receiptData.items.map((item) => (
                  <li key={item.product.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        <strong>{item.product.name}</strong> x {item.quantity}
                      </span>
                      <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div style={{ 
                borderTop: "1px solid #ddd", 
                marginTop: 10, 
                paddingTop: 10,
                fontWeight: "bold",
                fontSize: 18,
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>Total:</span>
                <span>${receiptData.total.toFixed(2)}</span>
              </div>
              <button
                style={{
                  margin: "20px auto 0 auto",
                  display: "block",
                  padding: "10px 20px",
                  background: "#4568dc",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={handleCloseReceipt}
              >
                Continue Shopping
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default CartPage;
