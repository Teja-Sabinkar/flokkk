// src/components/discussionpage/DiscussionPageRightBar/fixRecommendations.js

// Helper function to safely fetch recommendations with fallbacks and error handling
export async function fetchRecommendationsWithFallback(postData) {
  try {
    // Only proceed if we have post data with a title
    if (!postData || !postData.title) {
      return { recommendations: [], error: null };
    }
    
    // Extract post ID from postData
    const postId = getPostId(postData);
    
    // Construct API URL with post title and ID for fetching recommendations
    const apiUrl = `/api/recommendations?title=${encodeURIComponent(postData.title)}&postId=${encodeURIComponent(postId)}&limit=5`;
    
    // Set a timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(apiUrl, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-store' } // Prevent caching
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        return { recommendations: data.recommendations, error: null };
      } else {
        // Use default recommendations if the API returned empty results
        return { 
          recommendations: generateFallbackRecommendations(),
          error: null 
        };
      }
    } catch (fetchError) {
      console.warn('Fetch error:', fetchError);
      // Return fallback recommendations on fetch errors
      return { 
        recommendations: generateFallbackRecommendations(),
        error: null // Don't show error to user, just use fallbacks
      };
    }
  } catch (err) {
    console.error('Error in recommendation system:', err);
    // Return fallbacks with error set to null to prevent showing error
    return { 
      recommendations: generateFallbackRecommendations(),
      error: null
    };
  }
}

// Helper to safely extract post ID
function getPostId(postData) {
  if (!postData) return 'unknown';
  
  if (postData._id && typeof postData._id === 'object' && postData._id.$oid) {
    return postData._id.$oid;
  }
  
  if (postData._id && typeof postData._id === 'string') {
    return postData._id;
  }
  
  if (postData.id && typeof postData.id === 'object' && postData.id.$oid) {
    return postData.id.$oid;
  }
  
  if (postData.id && typeof postData.id === 'string') {
    return postData.id;
  }
  
  return 'unknown';
}

// Generate high-quality fallback recommendations
function generateFallbackRecommendations() {
  return [
    {
      id: 'fallback1-' + Date.now(),
      title: 'Popular Discussion: Gaming & Technology',
      username: 'techgamer',
      avatar: 'T',
      avatarColor: '#3b82f6',
      timeAgo: '2 days ago',
      discussions: '1.2K Discussions'
    },
    {
      id: 'fallback2-' + Date.now(),
      title: 'Updates & New Features: Platform Discussion',
      username: 'community',
      avatar: 'C',
      avatarColor: '#ef4444',
      timeAgo: '5 days ago',
      discussions: '845 Discussions'
    },
    {
      id: 'fallback3-' + Date.now(),
      title: 'Community Recommendations',
      username: 'moderator',
      avatar: 'M',
      avatarColor: '#06b6d4',
      timeAgo: '1 week ago',
      discussions: '2.3K Discussions'
    }
  ];
}