import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './CommunityTab.module.css';
import { CreatePostModal } from './index';
import { createCommunityPost, voteCommunityPost } from '@/lib/communityPosts';
import { ReportModal } from '@/components/report';
import { submitReport } from '@/components/report/reportService';
import { fetchUserProfile } from '@/lib/profile';

const CommunityPost = ({ post, onVote }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentVoteCount, setCurrentVoteCount] = useState(post.voteCount || 0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // New state for text expansion
  const menuRef = useRef(null);
  const textRef = useRef(null); // Reference to measure text height

  // Function to toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Menu option handlers
  const handleSave = () => {
    console.log(`Saved: ${post.title || 'post'}`);
    setIsMenuOpen(false);
  };

  const handleHide = () => {
    console.log(`Hidden: ${post.title || 'post'}`);
    setIsMenuOpen(false);
  };

  const handleReport = () => {
    // Close menu if it was opened from there
    setIsMenuOpen(false);
    // Open the report modal
    setIsReportModalOpen(true);
  };

  // Handle voting
  const handleVote = async (voteValue) => {
    try {
      // Call the vote API
      const result = await onVote(post.id, voteValue);

      // Update the vote count in the UI
      if (result && typeof result.voteCount === 'number') {
        setCurrentVoteCount(result.voteCount);
      }
    } catch (error) {
      console.error('Failed to register vote:', error);
      // Could show an error message to the user here
    }
  };

  const handleReportSubmit = async (reportData) => {
    try {
      await submitReport(reportData);
      setIsReportModalOpen(false);
      setReportSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setReportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2'; // Default blue color

    // Simple hash function for consistent color generation
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convert hash to a hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }

    return color;
  };

  // Add cache-busting parameter to image URL if it's from Vercel
  const getOptimizedImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Skip if it's a placeholder
    if (imageUrl.includes('/profile-placeholder.jpg') || 
        imageUrl.includes('/api/placeholder')) {
      return imageUrl;
    }
    
    // Add cache-busting parameter
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${post.imageUpdatedAt || Date.now()}`;
  };

  return (
    <div className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.profilePicture && post.profilePicture !== '/profile-placeholder.jpg' && post.profilePicture !== '/api/placeholder/64/64' ? (
              <Image
                src={getOptimizedImageUrl(post.profilePicture)}
                alt={`${post.username}'s avatar`}
                width={32}
                height={32}
                className={styles.avatar}
                priority
                unoptimized
                key={`profile-${post.id}-${post.imageUpdatedAt || Date.now()}`} // Force re-render when URL changes
              />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ backgroundColor: generateColorFromUsername(post.username) }}
              >
                <span className={styles.avatarInitial}>
                  {post.username ? post.username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            )}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.username}>{post.username}</span>
            <span className={styles.timeAgo}>{post.timeAgo}</span>
          </div>
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.moreButton}
            aria-label="Post menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {isMenuOpen && (
            <div className={styles.dropdown}>
              <button
                className={styles.actionButton}
                onClick={handleReport}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Report</span>
              </button>
            </div>
          )}
        </div>

        {/* Add the ReportModal component */}
        {isReportModalOpen && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            onSubmit={handleReportSubmit}
            contentDetails={{
              postId: post.id || post._id,
              userId: post.userId,
              username: post.username,
              title: post.title || '',
              content: post.content || '',
              hashtags: post.hashtags || [],
              image: post.image || null
            }}
          />
        )}
      </div>

      <div className={styles.postContent}>
        {/* Post Title */}
        {post.title && (
          <h3 className={styles.postTitle}>{post.title}</h3>
        )}

        {/* Modified post text with truncation */}
        <p
          ref={textRef}
          className={isExpanded ? styles.postText : styles.postTextTruncated}
        >
          {post.content}
        </p>

        {/* Show more/less toggle button */}
        {post.content && post.content.length > 100 && (
          <button
            className={styles.toggleButton}
            onClick={toggleExpanded}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Post Image Container with optimized image loading */}
        {post.image && (
          <div className={styles.postImageContainer}>
            <img
              src={getOptimizedImageUrl(post.image)}
              alt={post.title || "Post image"}
              className={styles.postImage}
              key={`community-image-${post.id || post._id}-${post.imageUpdatedAt || Date.now()}`} // Force re-render with unique key
              loading="lazy"
            />
          </div>
        )}
      </div>

      <div className={styles.postFooter}>
        <div className={styles.voteControls}>
          <button
            className={styles.upvoteButton}
            onClick={() => handleVote(1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L3 15H21L12 4Z" fill="currentColor" />
            </svg>
          </button>
          <span className={styles.voteCount}>{currentVoteCount}</span>
          <button
            className={styles.downvoteButton}
            onClick={() => handleVote(-1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20L3 9H21L12 20Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const CommunityTab = ({ username }) => {
  // State for posts and UI states
  const [posts, setPosts] = useState([]);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userProfiles, setUserProfiles] = useState({}); // Add userProfiles state
  const [refreshKey, setRefreshKey] = useState(Date.now()); // Add refresh key for forcing re-renders

  // Function to force refresh of all content
  const forceRefresh = () => {
    setRefreshKey(Date.now());
  };

  // New function to fetch and update user profiles with better image handling
  const fetchUserProfiles = async (postsArray) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return postsArray;

      // Get unique usernames from posts
      const usernames = [...new Set(postsArray.map(post => post.username))];

      // Fetch profile data for each unique user
      const profileData = {};

      await Promise.all(usernames.map(async (username) => {
        try {
          const userData = await fetchUserProfile(username, token);
          if (userData) {
            // Add a timestamp to force re-rendering of images
            userData.imageUpdatedAt = Date.now();
            profileData[username] = userData;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${username}:`, error);
        }
      }));

      setUserProfiles(profileData);

      // Update posts with latest profile pictures and timestamps
      return postsArray.map(post => {
        const userProfile = profileData[post.username];
        return {
          ...post,
          profilePicture: userProfile?.profilePicture || post.avatarSrc || '/profile-placeholder.jpg',
          imageUpdatedAt: Date.now() // Add timestamp to force image refresh
        };
      });
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      return postsArray;
    }
  };

  // Load community posts - use the general endpoint with username filtering
  const loadPosts = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use the general community posts endpoint with username filter
      // Add cache-busting parameter to prevent stale data
      const url = `/api/community-posts?username=${encodeURIComponent(username)}&page=${currentPage}&limit=10&t=${Date.now()}`;

      console.log(`Fetching community posts from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log(`API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error response: ${errorText}`);
        throw new Error(`Failed to fetch community posts: Status ${response.status}`);
      }

      const data = await response.json();
      console.log('Community posts API response:', data);

      const newPosts = data.posts || [];

      // Add timestamp to each post to ensure images refresh properly
      const postsWithTimestamps = newPosts.map(post => ({
        ...post,
        imageUpdatedAt: Date.now()
      }));

      // Fetch latest profile pictures for all post authors
      const postsWithUpdatedProfiles = await fetchUserProfiles(postsWithTimestamps);

      if (reset) {
        setPosts(postsWithUpdatedProfiles);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...postsWithUpdatedProfiles]);
      }

      // Check if there are more posts to load
      if (data.pagination) {
        setHasMore(currentPage < data.pagination.totalPages);
      } else {
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      console.error('Error loading community posts:', err);
      setError(`Failed to load posts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (username) {
      console.log(`Loading community posts for username: ${username}`);
      loadPosts(true);
    } else {
      console.error('No username provided to CommunityTab');
      setError('User information not available');
      setLoading(false);
    }
  }, [username, refreshKey]); // Add refreshKey to dependencies to force reload when needed

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('Profile updated event received, refreshing community posts');
      forceRefresh(); // Use forceRefresh instead of directly calling loadPosts
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  // Handle loading more posts
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadPosts();
    }
  };

  // Open create post modal
  const handleOpenCreatePostModal = () => {
    setIsCreatePostModalOpen(true);
  };

  // Close create post modal
  const handleCloseCreatePostModal = () => {
    setIsCreatePostModalOpen(false);
  };

  // Handle saving a new post
  const handleSavePost = async (postData) => {
    try {
      setLoading(true);

      // Add timestamp to ensure image refreshes
      const enhancedPostData = {
        ...postData,
        imageTimestamp: Date.now()
      };

      // Submit the post to the API
      const result = await createCommunityPost({
        title: enhancedPostData.title,
        content: enhancedPostData.description,
        image: enhancedPostData.image,
        imageTimestamp: enhancedPostData.imageTimestamp
      });

      if (result && result.post) {
        // Add timestamp to force image refresh
        const newPost = {
          ...result.post,
          imageUpdatedAt: Date.now()
        };

        // Fetch latest user profile for the new post author
        const updatedPosts = await fetchUserProfiles([newPost]);
        
        // Add the new post to the beginning of the posts array
        setPosts(prevPosts => [updatedPosts[0] || newPost, ...prevPosts]);

        // Force a refresh after a short delay to ensure images load properly
        setTimeout(forceRefresh, 500);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error creating community post:', error);
      setError('Failed to create post: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle voting on a post
  const handleVote = async (postId, voteValue) => {
    try {
      const result = await voteCommunityPost(postId, voteValue);
      return result;
    } catch (error) {
      console.error('Error voting on post:', error);
      return null;
    }
  };

  // Inline styles for elements that might not have corresponding CSS classes
  const errorMessageStyle = {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const retryButtonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    marginTop: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  };

  const loadingContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0'
  };

  const emptyStateStyle = {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    color: '#aaa',
    marginTop: '20px'
  };

  const loadMoreContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0'
  };

  const loadMoreButtonStyle = {
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  };

  return (
    <div className={styles.communityTabContainer}>
      <div className={styles.createPostSection}>
        <button
          className={styles.createPostButton}
          onClick={handleOpenCreatePostModal}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.dropdownItemIcon}>
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Create Post
        </button>
      </div>

      {error && (
        <div style={errorMessageStyle}>
          {error}
          <button
            onClick={() => {
              forceRefresh(); // Use forceRefresh to ensure a complete reload
            }}
            style={retryButtonStyle}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.postsContainer}>
        {posts.length > 0 ? (
          posts.map(post => (
            <CommunityPost
              key={`post-${post.id || post._id}-${post.imageUpdatedAt || Date.now()}`}
              post={post}
              onVote={handleVote}
            />
          ))
        ) : loading ? (
          <div style={loadingContainerStyle}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              borderTopColor: 'white',
              animation: 'spin 1s linear infinite',
              marginBottom: '12px'
            }}></div>
            <p>Loading posts...</p>
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <p>No community posts yet.</p>
            <p>Be the first to create a post!</p>
          </div>
        )}
      </div>

      {hasMore && (
        <div style={loadMoreContainerStyle}>
          <button
            style={{
              ...loadMoreButtonStyle,
              ...(loading ? { opacity: 0.5, cursor: 'not-allowed' } : {})
            }}
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={handleCloseCreatePostModal}
        onSave={handleSavePost}
      />
    </div>
  );
};

export default CommunityTab;