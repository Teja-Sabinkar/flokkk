// src/lib/playlists.js

// Event listeners for real-time updates
const listeners = [];

// Get all playlists for the current user
export const getPlaylists = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }
    
    const response = await fetch('/api/playlists?includePostImages=true', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlists');
    }
    
    const data = await response.json();
    return data.playlists || [];
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }
};

// Get a specific playlist by ID with its posts
export const getPlaylistById = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    
    const response = await fetch(`/api/playlists/${id}?includePostImages=true`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return null;
  }
};

// Create a new playlist
export const createPlaylist = async (title, initialPosts = []) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        posts: initialPosts
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create playlist');
    }
    
    const newPlaylist = await response.json();
    
    // Notify listeners
    notifyListeners();
    
    // Dispatch an event for components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playlist-updated'));
    }
    
    return newPlaylist;
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
};

// Add a post to a playlist
export const addPostToPlaylist = async (playlistId, post) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Make sure we have a valid post ID to send to the API
    // Try various ways to get the ID - different APIs might format it differently
    let postId = null;
    
    if (post.id) {
      postId = post.id;
    } else if (post._id) {
      postId = post._id;
    } else if (typeof post === 'string') {
      // If the post is just a string ID
      postId = post;
    }
    
    if (!postId) {
      console.error('Post data missing ID:', post);
      throw new Error('Invalid post data: missing ID');
    }
    
    // Convert to string if it's an object (like MongoDB ObjectId)
    if (typeof postId === 'object' && postId.toString) {
      postId = postId.toString();
    }
    
    console.log('Adding post to playlist:', { 
      playlistId, 
      postId,
      postTitle: post.title
    });
    
    // Send only the postId to the API
    const response = await fetch(`/api/playlists/${playlistId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ postId })
    });
    
    // Log the response status and URL for debugging
    console.log(`API call to ${response.url}, status: ${response.status}`);
    
    // Get response text for better error handling
    const responseText = await response.text();
    let responseData = null;
    
    // Try to parse as JSON
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.warn('Response is not valid JSON:', responseText);
      }
    }
    
    if (!response.ok) {
      const errorMessage = (responseData && responseData.message) || 
                          'Failed to add post to playlist';
      console.error('API error response:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Use response data if available, or create a basic response object
    const result = responseData || { 
      message: 'Post added successfully',
      playlistId,
      title: 'Playlist'
    };
    
    // Notify listeners about the update
    notifyListeners();
    
    // Dispatch a window event for components to react to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playlist-updated'));
    }
    
    return result;
  } catch (error) {
    console.error('Error adding post to playlist:', error);
    throw error;
  }
};

// Function to notify all listeners of changes
const notifyListeners = async () => {
  if (listeners.length > 0) {
    try {
      const playlists = await getPlaylists();
      listeners.forEach(listener => listener(playlists));
    } catch (error) {
      console.error('Error notifying listeners:', error);
    }
  }
};

// Subscribe to playlist changes
export const subscribeToPlaylists = (callback) => {
  listeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};