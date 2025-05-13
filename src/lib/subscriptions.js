/**
 * Utility functions for managing and fetching subscription data
 */

// Fetch subscription feed posts (posts from users the current user follows)
export async function fetchSubscriptionFeed(options = {}) {
  try {
    const { page = 1, limit = 10, token = localStorage.getItem('token') } = options;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`/api/subscriptions/feed?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch subscription feed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription feed:', error);
    throw error;
  }
}

// Get recently active subscriptions (users who have posted recently)
export async function getRecentSubscriptions(options = {}) {
  try {
    const { limit = 5, token = localStorage.getItem('token') } = options;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`/api/subscriptions/recent?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch recent subscriptions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching recent subscriptions:', error);
    throw error;
  }
}

// Get all users the current user is subscribed to
export async function getSubscriptionsList(options = {}) {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'recent', // 'recent' or 'alphabetical'
      token = localStorage.getItem('token') 
    } = options;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(
      `/api/subscriptions/list?page=${page}&limit=${limit}&sortBy=${sortBy}`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch subscriptions list');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscriptions list:', error);
    throw error;
  }
}

// Add a user to subscriptions (follow a user)
export async function followUser(options = {}) {
  try {
    const { username, userId, token = localStorage.getItem('token') } = options;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!username && !userId) {
      throw new Error('Either username or userId is required');
    }
    
    const payload = { action: 'follow' };
    
    if (userId) {
      payload.userId = userId;
    }
    
    if (username) {
      payload.username = username;
    }
    
    console.log(`Following user with:`, payload);
    
    const response = await fetch('/api/users/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to follow user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

// Remove a user from subscriptions (unfollow a user)
export async function unfollowUser(options = {}) {
  try {
    const { username, userId, token = localStorage.getItem('token') } = options;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    if (!username && !userId) {
      throw new Error('Either username or userId is required');
    }
    
    const payload = { action: 'unfollow' };
    
    if (userId) {
      payload.userId = userId;
    }
    
    if (username) {
      payload.username = username;
    }
    
    console.log(`Unfollowing user with:`, payload);
    
    const response = await fetch('/api/users/follow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to unfollow user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}