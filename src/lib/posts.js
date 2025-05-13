/**
 * Posts service for managing post operations across components
 */

// Create a post with the given data
export async function createPost(postData, token) {
  try {
    // Use provided token or get from localStorage
    const authToken = token || localStorage.getItem('token');
    if (!authToken) throw new Error('Authentication required');

    // Handle image upload if present
    let imageUrl = null;
    if (postData.thumbnailFile) {
      const formData = new FormData();
      formData.append('file', postData.thumbnailFile);
      formData.append('directory', 'posts');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData,
      });
      
      if (!uploadResponse.ok) throw new Error('Image upload failed');
      const uploadData = await uploadResponse.json();
      imageUrl = uploadData.filepath;
    } else if (postData.thumbnailPreview && !postData.thumbnailPreview.startsWith('/api/placeholder')) {
      // If there's a preview URL from fetched data, use that
      imageUrl = postData.thumbnailPreview;
    }
    
    // Prepare the post data
    const postPayload = {
      title: postData.title,
      content: postData.content || postData.description || '',
      image: imageUrl || postData.image || '/api/placeholder/600/300',
      videoUrl: postData.videoUrl || null,
      hashtags: postData.hashtags || [],
      isDiscussion: postData.isDiscussion || true
    };
    
    // Create post with API
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(postPayload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create post');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

// Fetch posts with various filtering options
export async function fetchPosts(options = {}) {
  const { 
    username, 
    page = 1, 
    limit = 10, 
    token = localStorage.getItem('token') 
  } = options;
  
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  try {
    // If username is provided, fetch user-specific posts
    if (username) {
      // First try the dedicated endpoint
      try {
        const encodedUsername = encodeURIComponent(username);
        const response = await fetch(`/api/users/${encodedUsername}/posts?page=${page}&limit=${limit}`, { headers });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('User posts API failed, falling back to filter', error);
      }
      
      // Fallback: get all posts and filter client-side
      const allPostsResponse = await fetch(`/api/posts?page=${page}&limit=${limit*2}`, { headers });
      if (!allPostsResponse.ok) throw new Error('Failed to fetch posts');
      
      const allPosts = await allPostsResponse.json();
      
      // Get current user data to compare
      const userResponse = await fetch('/api/auth/me', { headers });
      if (!userResponse.ok) throw new Error('Failed to get current user');
      
      const userData = await userResponse.json();
      
      // Filter posts by username match or userId match
      const userPosts = allPosts.posts.filter(post => 
        post.username.toLowerCase() === username.toLowerCase() ||
        post.userId === userData.id
      );
      
      return {
        posts: userPosts,
        pagination: {
          page,
          limit,
          totalPosts: userPosts.length
        }
      };
    }
    
    // Try the feed endpoint first
    try {
      const response = await fetch(`/api/posts/feed?page=${page}&limit=${limit}`, { headers });
      if (response.ok) {
        return await response.json();
      }
    } catch (feedError) {
      console.warn('Feed API not available, falling back to regular posts API');
    }
    
    // Otherwise, fetch all posts
    const response = await fetch(`/api/posts?page=${page}&limit=${limit}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch posts');
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchPosts:', error);
    throw error;
  }
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