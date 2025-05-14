/**
 * Community Posts utility functions for frontend
 */

// Create a new community post
// Create a new community post
export async function createCommunityPost(postData, token = null) {
  try {
    // Use provided token or get from localStorage
    const authToken = token || localStorage.getItem('token');
    if (!authToken) throw new Error('Authentication required');
    
    // Get username from token (to ensure correct association)
    let currentUsername = null;
    try {
      // Get current user data to ensure username is correct
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        currentUsername = userData.username;
      }
    } catch (e) {
      console.warn('Could not fetch current username:', e);
    }
    
    // Check if post data includes image file
    if (postData.image && postData.image instanceof File) {
      // Handle multipart/form-data submission with image file
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', postData.title);
      
      if (postData.content) {
        formData.append('content', postData.content);
      } else if (postData.description) {
        formData.append('description', postData.description);
      }
      
      if (postData.tags && Array.isArray(postData.tags)) {
        formData.append('tags', JSON.stringify(postData.tags));
      }
      
      // Add the current username explicitly
      if (currentUsername) {
        formData.append('authorUsername', currentUsername);
      }
      
      // Add image file
      formData.append('image', postData.image);
      
      // Send request
      const response = await fetch('/api/community-posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create community post');
      }
      
      return await response.json();
    } else {
      // Handle JSON submission without file
      const payload = {
        title: postData.title,
        content: postData.content || postData.description || '',
        tags: postData.tags || [],
        image: postData.image || null
      };
      
      // Add the current username explicitly
      if (currentUsername) {
        payload.authorUsername = currentUsername;
      }
      
      const response = await fetch('/api/community-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to create community post');
        } catch (e) {
          throw new Error(`Failed to create community post: ${errorText}`);
        }
      }
      
      return await response.json();
    }
  } catch (error) {
    console.error('Error creating community post:', error);
    throw error;
  }
}

// Fetch community posts with various filtering options
export async function fetchCommunityPosts(options = {}) {
  const {
    username,
    page = 1,
    limit = 10,
    token = localStorage.getItem('token')
  } = options;
  
  try {
    // If username is provided, we need to get user-specific posts
    // This explicitly directs to the user profile API instead of the general API
    if (username) {
      // Use the user-specific community endpoint
      const url = `/api/users/${encodeURIComponent(username)}/community?page=${page}&limit=${limit}`;
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch community posts for user: ${username}`);
      }
      
      const data = await response.json();
      
      // If we have access to community posts, return them
      if (data.canViewCommunity && data.communityPosts) {
        return {
          posts: data.communityPosts, 
          pagination: data.pagination
        };
      }
      
      // If access is restricted, return empty array with pagination
      return {
        posts: [],
        pagination: {
          page,
          limit,
          totalPosts: 0,
          totalPages: 0
        }
      };
    }
    
    // For general community posts (no specific user)
    const url = `/api/community-posts?page=${page}&limit=${limit}`;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error('Failed to fetch community posts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching community posts:', error);
    throw error;
  }
}

// Vote on a community post
export async function voteCommunityPost(postId, voteValue, token = null) {
  try {
    // Use provided token or get from localStorage
    const authToken = token || localStorage.getItem('token');
    if (!authToken) throw new Error('Authentication required');
    
    // Validate vote value
    if (![1, -1, 0].includes(voteValue)) {
      throw new Error('Invalid vote value. Must be 1 (upvote), -1 (downvote), or 0 (remove vote)');
    }
    
    // Send vote request
    const response = await fetch(`/api/community-posts/${postId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        vote: voteValue
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to vote on community post');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error voting on community post:', error);
    throw error;
  }
}