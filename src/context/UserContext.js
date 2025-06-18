'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isVerified } from '@/lib/auth'; // Import the new utility functions

// Create the context
const UserContext = createContext(null);

// Provider component
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('guest'); // 'guest', 'unverified', or 'verified'
  const router = useRouter();

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
  
    if (!token) {
      setAuthStatus('guest');
      setIsLoading(false);
      return null;
    }
  
    try {
      console.log("UserContext: Fetching user data with token");
      
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Auth response error:", errorData);
        throw new Error(errorData.message || 'Not authenticated');
      }
  
      const userData = await response.json();
      
      // Store verification status in localStorage for easy access
      localStorage.setItem('isVerified', userData.isEmailVerified.toString());
      
      // Update auth status
      setAuthStatus(userData.isEmailVerified ? 'verified' : 'unverified');
      
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('isVerified');
      setAuthStatus('guest');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isVerified');
    setUser(null);
    setAuthStatus('guest');
    router.push('/login');
  };
  
  // Check if the user can perform a specific action
  const canPerformAction = (actionType) => {
    if (authStatus === 'guest') {
      // Guests can only view limited content
      return actionType === 'view';
    }
    
    if (authStatus === 'unverified') {
      // Unverified users can view content but not interact
      return actionType === 'view' || actionType === 'account';
    }
    
    if (authStatus === 'verified') {
      // Verified users can do everything
      return true;
    }
    
    return false;
  };
  
  // Prompt user to verify email
  const promptVerification = () => {
    // This could show a modal, redirect to verification page, etc.
    console.log('Please verify your email to access this feature');
    // You could implement a modal or toast notification here
    return {
      message: 'Please verify your email to access all features',
      user: user
    };
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value = {
    user,
    setUser,
    isLoading,
    fetchUser,
    logout,
    authStatus,
    isVerified: authStatus === 'verified',
    isUnverified: authStatus === 'unverified',
    isGuest: authStatus === 'guest',
    canPerformAction,
    promptVerification
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Custom hook to use the context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined || context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}