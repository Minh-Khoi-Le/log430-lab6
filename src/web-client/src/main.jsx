/**
 * Main Entry Point for the React Application
 * 
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Import context providers for global state management
import { UserProvider } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";

// Render the application with context providers
// UserProvider - Manages user authentication state
// CartProvider - Manages shopping cart state
createRoot(document.getElementById('root')).render(
  
    <UserProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </UserProvider>
)
