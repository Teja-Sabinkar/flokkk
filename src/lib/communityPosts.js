// Modified createCommunityPost function in communityPosts.js
// Import this at the top of the file
// import { uploadImageToBlob } from './imageUtils'; // If you want to extract the upload logic

/**
 * Community Posts utility functions for frontend
 */

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
    
    // Convert the payload object
    const payload = {
      title: postData.title,
      content: postData.content || postData.description || '',
      tags: postData.tags || [],
      image: null // We'll set this after the blob upload if an image exists
    };
    
    // Add the current username explicitly
    if (currentUsername) {
      payload.authorUsername = currentUsername;
    }
    
    // Check if post data includes image file
    if (postData.image && postData.image instanceof File) {
      try {
        // Upload image to Vercel Blob
        const formData = new FormData();
        formData.append('image', postData.image);
        
        const uploadResponse = await fetch('/api/upload/blob', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Image upload error:', errorText);
          throw new Error('Failed to upload image');
        }
        
        const uploadResult = await uploadResponse.json();
        
        // Set the image URL in the payload
        payload.image = uploadResult.url;
      } catch (uploadError) {
        console.error('Error uploading image to Blob storage:', uploadError);
        // Continue without the image if upload fails
      }
    } else if (postData.image && typeof postData.image === 'string') {
      // If image is already a URL string, use it directly
      payload.image = postData.image;
    }
    
    // Create the community post with the prepared payload
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
  } catch (error) {
    console.error('Error creating community post:', error);
    throw error;
  }
}

// The rest of the file remains the same
// ... (Rest of the file)