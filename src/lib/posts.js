/**
 * Enhanced Posts service for managing post operations across components
 * This extends the existing posts.js file with edit functionality
 */

// Helper function to check if user is verified
const isUserVerified = () => {
  const isVerified = localStorage.getItem('isVerified');
  return isVerified === 'true';
};

// Create a post with the given data
export async function createPost(postData, token) {
  try {
    if (!token) throw new Error('Authentication required');
    
    // Check if user is verified
    if (!isUserVerified()) {
      throw new Error('Email verification required to create posts');
    }
    
    // ... existing createPost function implementation
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

// Fetch posts with various filtering options
export async function fetchPosts(options = {}) {
  // ... existing fetchPosts function - no verification needed for fetching
  // This allows unverified and guest users to view posts
}

// Get a single post by ID
export async function getPostById(postId, token = localStorage.getItem('token')) {
  try {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(`/api/posts/${postId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch post');

    return await response.json();
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
}

/**
 * Update an existing post with new data
 * @param {string} postId - The ID of the post to update
 * @param {Object} postData - The updated post data
 * @param {string} token - Authentication token (optional)
 * @returns {Promise<Object>} - The updated post
 */
export async function updatePost(postId, postData, token = localStorage.getItem('token')) {
  try {
    if (!token) throw new Error('Authentication required');
    if (!postId) throw new Error('Post ID is required');
    
    // Check if user is verified
    if (!isUserVerified()) {
      throw new Error('Email verification required to update posts');
    }
    
    console.log('Updating post with data:', postData);
    
    let imageUrl = null;
    if (postData.thumbnailFile) {
      const formData = new FormData();
      formData.append('file', postData.thumbnailFile);
      formData.append('directory', 'posts');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      if (!uploadResponse.ok) throw new Error('Image upload failed');
      const uploadData = await uploadResponse.json();
      imageUrl = uploadData.filepath;
    } 
    
    const updatePayload = {
      title: postData.title,
      content: postData.content || '',
      status: postData.status || 'published',
      tags: postData.tags || [],
      links: postData.links || [],
      communityLinks: postData.communityLinks || [] // INCLUDE COMMUNITY LINKS
    };
    
    if (imageUrl) {
      updatePayload.newThumbnail = imageUrl;
    } else if (postData.thumbnailPreview) {
      updatePayload.newThumbnail = postData.thumbnailPreview;
    } else if (postData.removeThumbnail) {
      updatePayload.removeThumbnail = true;
    }
    
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update post');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
}

/**
 * Delete a post by ID
 * @param {string} postId - The ID of the post to delete
 * @param {string} token - Authentication token (optional)
 * @returns {Promise<Object>} - Confirmation of deletion
 */
export async function deletePost(postId, token = localStorage.getItem('token')) {
  try {
    if (!token) throw new Error('Authentication required');
    if (!postId) throw new Error('Post ID is required');
    
    // Check if user is verified
    if (!isUserVerified()) {
      throw new Error('Email verification required to delete posts');
    }

    const response = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete post');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Vote on a post
 * @param {string} postId - The ID of the post to vote on
 * @param {number} voteValue - The vote value (1, -1, or 0)
 * @param {string} token - Authentication token (optional)
 * @returns {Promise<Object>} - Updated vote information
 */
export async function voteOnPost(postId, voteValue, voteType = 'creator', token = localStorage.getItem('token')) {
  try {
    if (!token) throw new Error('Authentication required');
    
    // Check if user is verified
    if (!isUserVerified()) {
      throw new Error('Email verification required to vote on posts');
    }
    
    // Validate vote value
    if (![1, -1, 0].includes(voteValue)) {
      throw new Error('Invalid vote value. Must be 1 (upvote), -1 (downvote), or 0 (remove vote)');
    }
    
    // Determine endpoint based on vote type
    const endpoint = voteType === 'community' 
      ? `/api/posts/${postId}/vote-community`
      : `/api/posts/${postId}/vote-creator`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vote: voteValue })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to ${voteValue > 0 ? 'upvote' : 'downvote'} post`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error voting on post:', error);
    throw error;
  }
}