'use client';

import { useState, useEffect } from 'react';
import styles from './RecommendationItems.module.css';

// Fallback recommendations in case the API fails or returns no results
const FALLBACK_RECOMMENDATIONS = [
  {
    id: 'fallback1',
    title: 'TIL that honey never spoils. Archaeologists have found...',
    username: 'honeyfacts',
    avatar: 'H',
    avatarColor: '#3b82f6', // Blue
    timeAgo: '5 days ago',
    discussions: '2.5M Discussions'
  },
  {
    id: 'fallback2',
    title: 'Jane Doe',
    username: 'janedoe',
    avatar: 'J',
    avatarColor: '#ef4444', // Red
    timeAgo: '2 months ago',
    discussions: '300K Discussions'
  },
  {
    id: 'fallback3',
    title: 'Understanding...',
    username: 'oceanfacts',
    avatar: 'O',
    avatarColor: '#06b6d4', // Cyan
    timeAgo: '1 year ago',
    discussions: '1.2M Discussions'
  }
];

// Default search terms to use if postData is missing
const DEFAULT_SEARCH_TERMS = [
  'Red Dead Redemption',
  'video games',
  'latest news'
];

export default function RecommendationItems({ postData }) {
  const [recommendations, setRecommendations] = useState(FALLBACK_RECOMMENDATIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  
  // Helper function to safely extract ID from MongoDB object or string
  const getPostId = (postData) => {
    if (!postData) return null;
    
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
  };

  // Fetch user profiles for recommendations
  const fetchUserProfiles = async (usernames) => {
    if (!usernames || usernames.length === 0) return;
    
    // Get authentication token
    const token = localStorage.getItem('token');
    
    // Create a copy of the current profiles
    const updatedProfiles = { ...userProfiles };
    
    // Fetch each username's profile if not already fetched
    for (const username of usernames) {
      if (updatedProfiles[username]) continue; // Skip if already fetched
      
      try {
        const response = await fetch(`/api/users/${username}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const profileData = await response.json();
          updatedProfiles[username] = profileData;
        } else {
          console.warn(`Failed to fetch profile for ${username}`);
        }
      } catch (err) {
        console.error(`Error fetching profile for ${username}:`, err);
      }
    }
    
    setUserProfiles(updatedProfiles);
  };
  
  // Perform direct search with default terms when component mounts if no postData
  useEffect(() => {
    const directSearch = async () => {
      // Only do direct search if postData is missing
      if (postData && postData.title) {
        return;
      }
      
      setLoading(true);
      
      // Try each default search term
      for (const term of DEFAULT_SEARCH_TERMS) {
        try {
          const apiUrl = `/api/recommendations?title=${encodeURIComponent(term)}&postId=direct-search&limit=5`;
          const response = await fetch(apiUrl);
          
          if (!response.ok) {
            continue;
          }
          
          const data = await response.json();
          
          if (data.recommendations && 
              Array.isArray(data.recommendations) && 
              data.recommendations.length > 0) {
            setRecommendations(data.recommendations);
            
            // Fetch user profiles for the recommendations
            const usernames = data.recommendations.map(item => item.username);
            await fetchUserProfiles(usernames);
            
            setLoading(false);
            return; // Exit after successful search
          }
        } catch (err) {
          console.error(`Error searching for "${term}":`, err);
        }
      }
      
      // If we get here, none of the searches worked
      setLoading(false);
    };
    
    directSearch();
  }, []);
  
  // Fetch recommendations when postData changes
  useEffect(() => {
    async function fetchRecommendations() {
      if (!postData || !postData.title) {
        return; // Direct search will handle this case
      }
      
      try {
        setLoading(true);
        
        // Get post ID properly
        const postId = getPostId(postData);
        
        // Construct API URL with post title and ID for fetching recommendations
        const apiUrl = `/api/recommendations?title=${encodeURIComponent(postData.title)}&postId=${encodeURIComponent(postId)}&limit=5`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.recommendations && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
          
          // Fetch user profiles for the recommendations
          const usernames = data.recommendations.map(item => item.username);
          await fetchUserProfiles(usernames);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
        // Keep fallback recommendations
      } finally {
        setLoading(false);
      }
    }
    
    fetchRecommendations();
  }, [postData]);
  
  // Improved format post ID function
  const formatPostId = (postId) => {
    if (!postId) return null;
    
    // Handle MongoDB ObjectId format with $oid property
    if (typeof postId === 'object' && postId.$oid) {
      return postId.$oid;
    }
    
    // Handle string ObjectId format with quotes
    if (typeof postId === 'string' && postId.includes('ObjectId')) {
      const match = postId.match(/ObjectId\(['"]([^'"]+)['"]\)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Handle JSON string format
    if (typeof postId === 'string' && (postId.startsWith('"') && postId.endsWith('"'))) {
      return postId.slice(1, -1);
    }
    
    // For any other format, convert to string and clean up
    return String(postId).trim();
  };
  
  // Get profile picture for a username
  const getProfilePicture = (username) => {
    if (userProfiles[username]?.profilePicture && 
        userProfiles[username].profilePicture !== '/profile-placeholder.jpg') {
      return userProfiles[username].profilePicture;
    }
    return null;
  };
  
  // Generate color from username (same as Post.js)
  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default color
    
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
  };
  
  // Handle menu button click
  const handleMenuButtonClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Menu clicked for item:", item.title);
    // Add your menu handling logic here
  };
  
  // Navigate to explore page
  const navigateToExplore = (e) => {
    e.preventDefault();
    window.location.href = '/explore';
  };
  
  // Display only the first 3 items
  const displayedRecommendations = recommendations.slice(0, 3);
  
  return (
    <div className={styles.recommendationsContainer}>
      <div className={styles.recommendationsHeader}>
        <h3>Recommended for you</h3>
      </div>
      
      {loading && <div className={styles.loadingIndicator}>Loading recommendations...</div>}
      
      {displayedRecommendations.map((item) => {
        const profilePicture = getProfilePicture(item.username);
        const formattedId = formatPostId(item.id);
        
        // Skip rendering for fallback items or items with invalid IDs
        if (!formattedId || formattedId.startsWith('fallback')) {
          return null;
        }
        
        // Create the URL directly
        const discussionUrl = `/discussion?id=${encodeURIComponent(formattedId)}`;
        
        return (
          <a 
            key={formattedId}
            href={discussionUrl}
            className={styles.recommendationLink}
          >
            <div className={styles.recommendationItem}>
              {profilePicture ? (
                // Show profile picture if available
                <div className={styles.avatar}>
                  <img 
                    src={profilePicture} 
                    alt={`${item.username}'s profile`} 
                    width={32} 
                    height={32} 
                    className={styles.avatarImage}
                  />
                </div>
              ) : (
                // Fallback to avatar with first letter of username and background color based on username
                <div 
                  className={styles.avatar} 
                  style={{ backgroundColor: generateColorFromUsername(item.username) }}
                >
                  <span className={styles.avatarInitial}>
                    {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              )}
              
              <div className={styles.contentContainer}>
                <div className={styles.titleRow}>
                  <h3 className={styles.title}>
                    {item.title}
                  </h3>
                </div>
                <div className={styles.metaInfo}>
                  <span className={styles.username}>{item.username}</span>
                  <span className={styles.timeAgo}>{item.timeAgo}</span>
                </div>
                <div className={styles.discussionCount}>
                  {item.discussions}
                </div>
              </div>
            </div>
          </a>
        );
      })}
      
      {/* Changed 'Show more' to 'View more' and redirects to explore page */}
      <a 
        href="/explore" 
        className={styles.viewMoreButton}
        onClick={navigateToExplore}
      >
        View more
      </a>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}