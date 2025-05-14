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

  return (
    <div className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.profilePicture && post.profilePicture !== '/profile-placeholder.jpg' && post.profilePicture !== '/api/placeholder/64/64' ? (
              <Image
                src={post.profilePicture}
                alt={`${post.username}'s avatar`}
                width={32}
                height={32}
                className={styles.avatar}
                priority
                unoptimized
                key={post.profilePicture} // Force re-render when URL changes
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

        {/* Post Image Container */}
        {post.image && (
          <div className={styles.postImageContainer}>
            <img
              src={post.image}
              alt={post.title || "Post image"}
              className={styles.postImage}
              key={`community-image-${post.id || post._id}-${post.image}`} // Force re-render when image changes
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

  // New function to fetch and update user profiles
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
            profileData[username] = userData;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${username}:`, error);
        }
      }));

      setUserProfiles(profileData);

      // Update posts with latest profile pictures
      return postsArray.map(post => {
        const userProfile = profileData[post.username];
        return {
          ...post,
          profilePicture: userProfile?.profilePicture || post.avatarSrc || '/profile-placeholder.jpg'
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
      const url = `/api/community-posts?username=${encodeURIComponent(username)}&page=${currentPage}&limit=10`;

      console.log(`Fetching community posts from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
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

      // Fetch latest profile pictures for all post authors
      const postsWithUpdatedProfiles = await fetchUserProfiles(newPosts);

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
  }, [username]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('Profile updated event received, refreshing community posts');
      loadPosts(true);
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [username]);

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

      // Validate image if present
      if (postData.image) {
        const fileSize = postData.image.size;
        if (fileSize > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          setLoading(false);
          return false;
        }
      }

      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // If there's an image, upload it first to MongoDB
      let imagePath = null;
      if (postData.image) {
        const imageFormData = new FormData();
        imageFormData.append('file', postData.image);
        imageFormData.append('directory', 'posts');

        const uploadResponse = await fetch('/api/images', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: imageFormData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.message || 'Failed to upload image');
        }

        const uploadResult = await uploadResponse.json();
        imagePath = uploadResult.filepath;
      }

      // Create the post with the image path
      const postFormData = new FormData();
      postFormData.append('title', postData.title);
      postFormData.append('content', postData.description || '');

      // If we have an image path, add it to the form data
      if (imagePath) {
        postFormData.append('image', imagePath);
      }

      // Submit the post data
      const response = await fetch('/api/community-posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: postFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create post');
      }

      const result = await response.json();

      if (result && result.post) {
        // Update UI and return success
        const updatedPost = await fetchUserProfiles([result.post]);
        setPosts(prevPosts => [updatedPost[0] || result.post, ...prevPosts]);
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
            onClick={() => loadPosts(true)}
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
              key={post.id || post._id}
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