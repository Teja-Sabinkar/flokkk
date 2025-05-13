// src/components/discussionpage/DiscussionPageRightBar/fixRecommendations.js

// Helper function to safely fetch recommendations with fallbacks and creator-based fallbacks
export async function fetchRecommendationsWithFallback(postData) {
  try {
    // Only proceed if we have post data with a title
    if (!postData || (!postData.title && !postData.content)) {
      return { recommendations: [], error: null };
    }
    
    // Extract post ID and creator info from postData
    const postId = getPostId(postData);
    const creatorUsername = postData.username || postData.author || null;
    
    // Construct API URL with post title and ID for fetching recommendations
    // Use either title or content if title is missing
    const titleParam = postData.title || postData.content.substring(0, 50);
    const apiUrl = `/api/recommendations?title=${encodeURIComponent(titleParam)}&postId=${encodeURIComponent(postId)}&limit=5`;
    
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
        // No similar recommendations found, try to get posts from the same creator
        if (creatorUsername) {
          console.log(`No recommendations found, trying to fetch posts from creator: ${creatorUsername}`);
          const creatorRecommendations = await fetchCreatorPosts(creatorUsername, postId);
          
          if (creatorRecommendations.length > 0) {
            return { 
              recommendations: creatorRecommendations,
              error: null,
              source: 'creator'
            };
          }
        }
        
        // If no creator posts found, try tag-based recommendations
        if (postData.hashtags || postData.tags) {
          const tags = postData.hashtags || postData.tags;
          if (Array.isArray(tags) && tags.length > 0) {
            console.log(`Trying tag-based recommendations with tags: ${tags.join(', ')}`);
            const tagRecommendations = await fetchTagBasedPosts(tags, postId);
            
            if (tagRecommendations.length > 0) {
              return { 
                recommendations: tagRecommendations,
                error: null,
                source: 'tags'
              };
            }
          }
        }
        
        // Use semantic search as a last resort
        return await fetchSemanticRecommendations(postData, postId);
      }
    } catch (fetchError) {
      console.warn('Fetch error:', fetchError);
      
      // Try creator posts as first fallback if creator username is available
      if (creatorUsername) {
        try {
          console.log(`Fetch error, trying creator posts for: ${creatorUsername}`);
          const creatorRecommendations = await fetchCreatorPosts(creatorUsername, postId);
          
          if (creatorRecommendations.length > 0) {
            return { 
              recommendations: creatorRecommendations,
              error: null,
              source: 'creator'
            };
          }
        } catch (creatorError) {
          console.warn('Error fetching creator posts:', creatorError);
        }
      }
      
      // If tag-based posts are available, try that
      if (postData.hashtags || postData.tags) {
        try {
          const tags = postData.hashtags || postData.tags;
          if (Array.isArray(tags) && tags.length > 0) {
            const tagRecommendations = await fetchTagBasedPosts(tags, postId);
            
            if (tagRecommendations.length > 0) {
              return { 
                recommendations: tagRecommendations,
                error: null,
                source: 'tags'
              };
            }
          }
        } catch (tagError) {
          console.warn('Error fetching tag-based posts:', tagError);
        }
      }
      
      // Use semantic search as last resort
      return await fetchSemanticRecommendations(postData, postId);
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

// New function to fetch posts from the same creator
async function fetchCreatorPosts(username, currentPostId) {
  if (!username) return [];
  
  try {
    // Get auth token
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // Fetch posts by username
    const userUrl = `/api/users/${encodeURIComponent(username)}/posts?limit=5`;
    const response = await fetch(userUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch creator posts: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.posts || !Array.isArray(data.posts)) {
      return [];
    }
    
    // Filter out the current post and transform to recommendation format
    return data.posts
      .filter(post => {
        const postId = post.id || post._id;
        return postId && postId.toString() !== currentPostId.toString();
      })
      .map(post => {
        // Format time ago
        const timeAgo = formatTimeAgo(post.createdAt || new Date());
        
        // Format discussion count
        const discussionCount = formatNumber(post.discussions || 0);
        
        return {
          id: post.id || post._id,
          title: post.title,
          username: username,
          avatar: username.charAt(0).toUpperCase(),
          avatarColor: generateColorFromUsername(username),
          timeAgo: timeAgo,
          discussions: `${discussionCount} Discussions`,
          isFromSameCreator: true
        };
      })
      .slice(0, 3); // Limit to 3 posts
  } catch (error) {
    console.error('Error fetching creator posts:', error);
    return [];
  }
}

// New function to fetch tag/hashtag-based posts
async function fetchTagBasedPosts(tags, currentPostId) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return [];
  
  try {
    // Get auth token
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    // Try each tag to find related posts
    let allPosts = [];
    
    for (const tag of tags) {
      // Skip very short tags
      if (tag.length < 3) continue;
      
      // Remove # from hashtags
      const cleanTag = tag.replace(/^#/, '');
      
      // Search using the search API instead of dedicated tags API
      const searchUrl = `/api/search?q=${encodeURIComponent(cleanTag)}&type=post`;
      const response = await fetch(searchUrl, { headers });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        // Only get post type results and filter out current post
        const posts = data.results
          .filter(result => result.type === 'post')
          .filter(post => {
            const postId = post._id;
            return postId && postId.toString() !== currentPostId.toString();
          });
        
        allPosts.push(...posts);
        
        // If we have enough posts, break early
        if (allPosts.length >= 5) break;
      }
    }
    
    // Remove duplicates by postId
    const uniquePosts = [];
    const seenIds = new Set();
    
    for (const post of allPosts) {
      const postId = post._id;
      if (!seenIds.has(postId)) {
        seenIds.add(postId);
        uniquePosts.push(post);
      }
    }
    
    // Format the posts
    return uniquePosts
      .map(post => {
        // Format time ago
        const timeAgo = formatTimeAgo(post.createdAt || new Date());
        
        // Format discussion count
        const discussionCount = formatNumber(post.discussions || 0);
        
        return {
          id: post._id,
          title: post.title,
          username: post.username,
          avatar: post.username ? post.username.charAt(0).toUpperCase() : 'U',
          avatarColor: generateColorFromUsername(post.username),
          timeAgo: timeAgo,
          discussions: `${discussionCount} Discussions`,
          isFromTags: true
        };
      })
      .slice(0, 3); // Limit to 3 posts
  } catch (error) {
    console.error('Error fetching tag-based posts:', error);
    return [];
  }
}

// New function to do a semantically guided search using Claude-like approach
async function fetchSemanticRecommendations(postData, currentPostId) {
  try {
    // Extract the main topic using title and content
    const title = postData.title || '';
    const content = postData.content || '';
    
    // Extract main semantically meaningful words (simple approach)
    const stopWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by',
      'in', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'can', 'could', 'will', 'would', 'should', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 
      'this', 'that', 'these', 'those']);
    
    // Combine title and first 100 chars of content
    const combinedText = title + ' ' + content.substring(0, 100);
    
    // Extract words, filter stop words and short words
    const words = combinedText.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    // Count word frequency
    const wordCounts = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Get top 3 most frequent words
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    if (topWords.length === 0) {
      // If no meaningful words found, return fallbacks
      return { 
        recommendations: generateFallbackRecommendations(),
        error: null 
      };
    }
    
    // Use search API with the top words
    const searchQuery = topWords.join(' ');
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const searchUrl = `/api/search?q=${encodeURIComponent(searchQuery)}&type=post`;
    const response = await fetch(searchUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Search API responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      return { 
        recommendations: generateFallbackRecommendations(),
        error: null 
      };
    }
    
    // Filter and format the results
    const recommendations = data.results
      .filter(result => result.type === 'post')
      .filter(post => {
        const postId = post._id;
        return postId && postId.toString() !== currentPostId.toString();
      })
      .map(post => {
        // Format time ago
        const timeAgo = formatTimeAgo(post.createdAt || new Date());
        
        // Format discussion count
        const discussionCount = formatNumber(post.discussions || 0);
        
        return {
          id: post._id,
          title: post.title,
          username: post.username,
          avatar: post.username ? post.username.charAt(0).toUpperCase() : 'U',
          avatarColor: generateColorFromUsername(post.username),
          timeAgo: timeAgo,
          discussions: `${discussionCount} Discussions`,
          isFromSemanticSearch: true
        };
      })
      .slice(0, 3);
    
    if (recommendations.length > 0) {
      return { 
        recommendations,
        error: null,
        source: 'semantic' 
      };
    }
    
    // If still no results, return fallbacks
    return { 
      recommendations: generateFallbackRecommendations(),
      error: null 
    };
  } catch (error) {
    console.error('Error in semantic recommendation:', error);
    return { 
      recommendations: generateFallbackRecommendations(),
      error: null 
    };
  }
}

// Helper function to safely extract ID from various formats
function getPostId(postData) {
  if (!postData) return 'unknown';

  // Check if _id is an object with $oid property (MongoDB format)
  if (postData._id && typeof postData._id === 'object' && postData._id.$oid) {
    return postData._id.$oid;
  }

  // Check for string _id
  if (postData._id && typeof postData._id === 'string') {
    return postData._id;
  }

  // Check if id is an object with $oid property
  if (postData.id && typeof postData.id === 'object' && postData.id.$oid) {
    return postData.id.$oid;
  }

  // Check for string id
  if (postData.id && typeof postData.id === 'string') {
    return postData.id;
  }

  // Default fallback
  return 'unknown';
}

// Generate color from username
function generateColorFromUsername(username) {
  if (!username) return '#3b82f6'; // Default color
  
  // Simple hash function to get consistent colors
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

// Helper function to format time ago
function formatTimeAgo(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// Helper function to format numbers (1.2K, 3M, etc.)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Helper function to handle fallbacks when all recommendation strategies fail
function generateFallbackRecommendations() {
  // Return empty array instead of mock data - this will trigger proper error handling
  return [];
}