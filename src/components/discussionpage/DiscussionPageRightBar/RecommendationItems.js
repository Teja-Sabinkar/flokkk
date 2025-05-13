'use client';

import { useState, useEffect } from 'react';
import styles from './RecommendationItems.module.css';
import { fetchRecommendationsWithFallback } from './fixRecommendations';

// Common English stop words to filter out from keywords
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by',
  'in', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'i',
  'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'
]);

export default function RecommendationItems({ postData }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [recommendationSource, setRecommendationSource] = useState('similar');
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

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

  // Use Claude AI approach to extract meaningful keywords for search
  const extractKeywords = (title, content = '', hashtags = []) => {
    if (!title || typeof title !== 'string') return [];
    
    // Combine title, content, and hashtags for more context
    let combinedText = title;
    if (content && typeof content === 'string') {
      combinedText += ' ' + content.substring(0, 200); // Use first 200 chars of content
    }
    
    // Add hashtags for improved context
    if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
      combinedText += ' ' + hashtags.join(' ');
    }

    // Split by non-alphanumeric characters and filter
    const words = combinedText.toLowerCase()
      .split(/\W+/)
      .filter(word =>
        word.length > 3 && // Only words longer than 3 chars
        !STOP_WORDS.has(word) && // Filter out stop words
        !(/^\d+$/.test(word)) // Filter out numbers
      );

    // Prioritize hashtags as keywords
    const hashtagKeywords = hashtags
      .map(tag => tag.replace(/^#/, '').toLowerCase())
      .filter(tag => tag.length > 1);
      
    // Get most frequent meaningful words
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort words by frequency, then by length (prefer longer words)
    const sortedWords = Object.keys(wordCounts).sort((a, b) => {
      const countDiff = wordCounts[b] - wordCounts[a];
      return countDiff !== 0 ? countDiff : b.length - a.length;
    });
    
    // Combine hashtags and frequent words, remove duplicates
    const combinedKeywords = [...new Set([...hashtagKeywords, ...sortedWords])];
    
    // Return up to 5 most significant keywords
    return combinedKeywords.slice(0, 5);
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
      if (postData && (postData.title || postData.content)) {
        return;
      }

      setLoading(true);
      setHasAttemptedFetch(true);

      // Get search terms from the URL if possible (e.g., /discussion?topic=games)
      const urlParams = new URLSearchParams(window.location.search);
      const urlTopic = urlParams.get('topic') || '';

      // Either use URL topic or generic fallbacks
      const searchTerms = urlTopic ?
        extractKeywords(urlTopic) :
        ['trending'];

      // Try each keyword as a search term
      for (const term of searchTerms) {
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

            setError(null);
            setLoading(false);
            return; // Exit after successful search
          }
        } catch (err) {
          console.error(`Error searching for "${term}":`, err);
        }
      }

      // If we get here, none of the searches worked
      setError('Failed to fetch recommendations');
      setLoading(false);
    };

    directSearch();
  }, []);

  // Fetch recommendations when postData changes
  useEffect(() => {
    async function fetchRecommendations() {
      if (!postData) {
        return; // Direct search will handle this case
      }

      try {
        setLoading(true);
        setHasAttemptedFetch(true);

        // Enhanced postData preparation to ensure we use all available information
        const enhancedPostData = {
          ...postData,
          // Ensure we have consistent property names between different components
          title: postData.title || '',
          content: postData.content || '',
          hashtags: postData.hashtags || postData.tags || [],
          username: postData.username || postData.author || ''
        };

        // First try the normal recommendation fetch
        const { recommendations: fetchedRecommendations, error: fetchError, source } =
          await fetchRecommendationsWithFallback(enhancedPostData);

        if (fetchedRecommendations && fetchedRecommendations.length > 0) {
          setRecommendations(fetchedRecommendations);
          setRecommendationSource(source || 'similar');

          // Fetch user profiles for the recommendations
          const usernames = fetchedRecommendations.map(item => item.username);
          await fetchUserProfiles(usernames);

          setError(null);
        } else {
          // No recommendations from primary method, try keyword search
          // Extract keywords using our enhanced method that combines title, content and hashtags
          const keywords = extractKeywords(
            enhancedPostData.title, 
            enhancedPostData.content, 
            enhancedPostData.hashtags
          );
          let foundRecommendations = false;

          // Try each keyword
          for (const keyword of keywords) {
            if (keyword.length < 3) continue; // Skip very short keywords

            try {
              const apiUrl = `/api/recommendations?title=${encodeURIComponent(keyword)}&postId=${getPostId(enhancedPostData)}&limit=5`;
              const response = await fetch(apiUrl);

              if (!response.ok) continue;

              const data = await response.json();

              if (data.recommendations &&
                Array.isArray(data.recommendations) &&
                data.recommendations.length > 0) {
                setRecommendations(data.recommendations);
                setRecommendationSource('keyword');

                // Fetch user profiles
                const usernames = data.recommendations.map(item => item.username);
                await fetchUserProfiles(usernames);

                setError(null);
                foundRecommendations = true;
                break;
              }
            } catch (keywordErr) {
              console.error(`Error searching with keyword "${keyword}":`, keywordErr);
            }
          }

          // If still no recommendations, try another approach with Claude-like semantic search
          if (!foundRecommendations) {
            try {
              // Use search API instead of recommendations API as a fallback
              // This gives us more flexibility in finding related content
              const searchQuery = enhancedPostData.title.split(' ').slice(0, 3).join(' ');
              const searchResponse = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=post`);
              
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                
                if (searchData.results && searchData.results.length > 0) {
                  // Format search results to match recommendation format
                  const formattedResults = searchData.results
                    .filter(result => result.type === 'post')
                    .filter(result => {
                      // Filter out the current post
                      const resultId = result._id.toString();
                      const currentId = getPostId(enhancedPostData);
                      return resultId !== currentId;
                    })
                    .map(result => ({
                      id: result._id,
                      title: result.title,
                      username: result.username,
                      avatar: result.username ? result.username.charAt(0).toUpperCase() : 'U',
                      avatarColor: generateColorFromUsername(result.username),
                      timeAgo: formatTimeAgo(result.createdAt),
                      discussions: formatNumber(result.discussions || 0) + ' Discussions'
                    }))
                    .slice(0, 3);
                  
                  if (formattedResults.length > 0) {
                    setRecommendations(formattedResults);
                    setRecommendationSource('search');
                    setError(null);
                    foundRecommendations = true;
                  }
                }
              }
            } catch (searchErr) {
              console.error('Error using search API fallback:', searchErr);
            }
          }

          if (!foundRecommendations) {
            setError('Failed to fetch recommendations');
            setRecommendations([]);
          }
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to fetch recommendations');
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [postData]);

  // Error handling for recommendations
  useEffect(() => {
    if (error && !loading) {
      setRecommendations([]);
    }
  }, [error, loading]);

  // Retry function for recommendations
  const handleRetry = () => {
    if (postData && (postData.title || postData.content)) {
      // Reset states
      setError(null);
      setLoading(true);
      setHasAttemptedFetch(false);

      // Re-fetch recommendations
      fetchRecommendations();
    } else {
      // Run direct search again
      setError(null);
      setLoading(true);
      setHasAttemptedFetch(false);
      directSearch();
    }
  };

  // Format time ago function
  const formatTimeAgo = (dateString) => {
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
  };

  // Format number function (e.g., 1.2K, 3M)
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

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
        <h3>
          {recommendationSource === 'creator'
            ? 'More from this creator'
            : recommendationSource === 'search'
            ? 'Related discussions'
            : 'Recommended for you'}
        </h3>
      </div>

      {loading && <div className={styles.loadingIndicator}>Loading recommendations...</div>}

      {/* Show error message when there's an error and we're not loading */}
      {error && !loading && hasAttemptedFetch && (
        <div className={styles.recommendationError}>
          <p>Failed to fetch recommendations</p>
          <button
            className={styles.retryButton}
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}

      {/* Only show recommendations if there are any and no error */}
      {!error && displayedRecommendations.length > 0 && (
        <>
          {displayedRecommendations.map((item) => {
            const profilePicture = getProfilePicture(item.username);
            const formattedId = formatPostId(item.id);

            // Skip invalid IDs
            if (!formattedId) {
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

          <a
            href="/explore"
            className={styles.viewMoreButton}
            onClick={navigateToExplore}
          >
            View more
          </a>
        </>
      )}
    </div>
  );
}