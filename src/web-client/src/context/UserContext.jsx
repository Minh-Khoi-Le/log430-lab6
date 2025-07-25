/**
 * User Context
 * 
 * This file provides a React Context for managing user authentication state.
 * It handles user login/logout and persists the user state in localStorage.
 */

import React, { createContext, useContext, useState, useEffect } from "react";

// Create a context for user data
const UserContext = createContext();

/**
 * UserProvider Component
 * 
 * Provides user authentication state to the application.
 * Manages:
 * - User login state
 * - Persistence of user data in localStorage
 * - User role information
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that will have access to the context
 */
export function UserProvider({ children }) {
  const [user, setUserState] = useState(null);

  // Load saved user from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUserState(JSON.parse(savedUser));
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Function to update user state
  const setUser = (u) => setUserState(u);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Custom hook for accessing the user context
 * 
 * Provides easy access to user state and functions in any component
 * 
 * @returns {Object} User context containing:
 * - user: Current user object or null if not logged in
 * - setUser: Function to update user state
 */
export function useUser() {
  return useContext(UserContext);
}
