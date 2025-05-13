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
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'An error occurred during login');
  }
}

// Register function - calls the signup API
export async function register(name, email, password) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
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
    return userData;
  } catch (error) {
    throw new Error(error.message || 'An error occurred');
  }
}

// Logout function
export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
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