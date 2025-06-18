/**
 * Authentication utility functions for the frontend
 */

// Login function - calls the login API
export async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token in localStorage for client-side access
    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('token', data.token);
      // Store verification status separately for easy access
      localStorage.setItem('isVerified', data.user.isEmailVerified.toString());
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'An error occurred during login');
  }
}

// Register function - calls the signup API
export async function register(name, username, email, password) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // If signup returns a token (for immediate limited access), store it
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isVerified', 'false'); // New users are unverified by default
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'An error occurred during registration');
  }
}

// Forgot password function - calls the forgot-password API
export async function forgotPassword(email) {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset link');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'An error occurred');
  }
}

// Get the current user from API
export async function getCurrentUser() {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Not in browser environment');
    }

    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user data');
    }

    const userData = await response.json();
    
    // Update verification status in localStorage
    localStorage.setItem('isVerified', userData.isEmailVerified.toString());
    
    return userData;
  } catch (error) {
    throw new Error(error.message || 'An error occurred');
  }
}

// Logout function
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('isVerified');
    // Clear cookie as well
    document.cookie = 'token=; path=/; max-age=0';
  }
}

// Check if user is authenticated
export function isAuthenticated() {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('token');
  }
  return false;
}

// Check if user is verified
export function isVerified() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('isVerified') === 'true';
  }
  return false;
}

// Check if user can perform a restricted action
export function canPerformAction(actionType) {
  const authenticated = isAuthenticated();
  const verified = isVerified();
  
  // For view-only actions, just need to be authenticated
  if (actionType === 'view') {
    return true; // Even guests can view limited content
  }
  
  // For interactive actions like commenting, voting, posting
  if (['comment', 'vote', 'post', 'create'].includes(actionType)) {
    return authenticated && verified;
  }
  
  // For account-management actions
  if (actionType === 'account') {
    return authenticated;
  }
  
  return false;
}