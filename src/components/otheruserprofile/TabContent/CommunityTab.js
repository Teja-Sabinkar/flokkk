import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './CommunityTab.module.css';
import { ReportModal } from '@/components/report';
import { submitReport } from '@/components/report/reportService';

// Add this component for fetching and displaying user avatars
const UserAvatar = ({ username }) => {
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          headers
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.profilePicture &&
            userData.profilePicture !== '/profile-placeholder.jpg') {
            setProfilePic(userData.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div
        className={styles.avatarPlaceholder}
        style={{ backgroundColor: generateColorFromUsername(username) }}
      >
        <span className={styles.avatarInitial}>
          {username ? username.charAt(0).toUpperCase() : 'U'}
        </span>
      </div>
    );
  }

  if (profilePic) {
    return (
      <Image
        src={profilePic}
        alt={`${username}'s avatar`}
        width={32}
        height={32}
        className={styles.avatar}
        priority
        unoptimized
        key={profilePic} // Force re-render when URL changes
      />
    );
  }

  return (
    <div
      className={styles.avatarPlaceholder}
      style={{ backgroundColor: generateColorFromUsername(username) }}
    >
      <span className={styles.avatarInitial}>
        {username ? username.charAt(0).toUpperCase() : 'U'}
      </span>
    </div>
  );
};

// Helper function for generating colors from usernames - making it global so UserAvatar can use it
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

const CommunityPost = ({ post, onVote }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentVoteCount, setCurrentVoteCount] = useState(post.voteCount || 0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const menuRef = useRef(null);
  const textRef = useRef(null);

  // Check if toggle button is needed
  useEffect(() => {
    if (textRef.current && post.content) {
      const checkTextOverflow = () => {
        const element = textRef.current;
        
        // Save current styles
        const originalDisplay = element.style.display;
        const originalWebkitLineClamp = element.style.webkitLineClamp;
        const originalWebkitBoxOrient = element.style.webkitBoxOrient;
        const originalOverflow = element.style.overflow;
        
        // Temporarily show full text to measure height
        element.style.display = 'block';
        element.style.webkitLineClamp = 'unset';
        element.style.webkitBoxOrient = 'unset';
        element.style.overflow = 'visible';
        const fullHeight = element.scrollHeight;
        
        // Now apply truncation to measure truncated height
        element.style.display = '-webkit-box';
        element.style.webkitLineClamp = '2';
        element.style.webkitBoxOrient = 'vertical';
        element.style.overflow = 'hidden';
        const truncatedHeight = element.clientHeight;
        
        // Restore original styles
        element.style.display = originalDisplay;
        element.style.webkitLineClamp = originalWebkitLineClamp;
        element.style.webkitBoxOrient = originalWebkitBoxOrient;
        element.style.overflow = originalOverflow;
        
        // Determine if toggle is needed
        const needsToggleButton = fullHeight > truncatedHeight + 5;
        setNeedsToggle(needsToggleButton);
      };

      const timeoutId = setTimeout(checkTextOverflow, 10);
      
      const handleResize = () => {
        clearTimeout(timeoutId);
        setTimeout(checkTextOverflow, 10);
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', handleResize);
      };
    } else {
      setNeedsToggle(false);
    }
  }, [post.content]);

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

  // Handle voting
  const handleVote = async (voteValue) => {
    try {
      const result = await onVote(post.id, voteValue);
      if (result && typeof result.voteCount === 'number') {
        setCurrentVoteCount(result.voteCount);
      }
    } catch (error) {
      console.error('Failed to register vote:', error);
    }
  };

  const handleReport = () => {
    setIsMenuOpen(false);
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = async (reportData) => {
    try {
      await submitReport(reportData);
      setIsReportModalOpen(false);
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
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
                key={post.profilePicture}
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
              <button className={styles.actionButton} onClick={handleReport}>
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
        {post.title && (
          <h3 className={styles.postTitle}>{post.title}</h3>
        )}

        {/* Post text with proper truncation */}
        <p
          ref={textRef}
          className={isExpanded ? styles.postText : `${styles.postText} ${styles.postTextTruncated}`}
        >
          {post.content}
        </p>

        {/* Show toggle button when needed */}
        {needsToggle && (
          <button
            className={styles.toggleButton}
            onClick={toggleExpanded}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {post.image && (
          <div className={styles.postImageContainer}>
            <img
              src={post.image}
              alt={post.title || "Post image"}
              className={styles.postImage}
              key={`community-image-${post.id || post._id}-${post.image}`}
            />
          </div>
        )}
      </div>

      <div className={styles.postFooter}>
        <div className={styles.voteControls}>
          <button className={styles.upvoteButton} onClick={() => handleVote(1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L3 15H21L12 4Z" fill="currentColor" />
            </svg>
          </button>
          <span className={styles.voteCount}>{currentVoteCount}</span>
          <button className={styles.downvoteButton} onClick={() => handleVote(-1)}>
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
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userProfiles, setUserProfiles] = useState({});

  // Function to fetch and update user profiles
  const fetchUserProfiles = async (postsArray) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return postsArray;

      const usernames = [...new Set(postsArray.map(post => post.username))];
      const profileData = {};

      await Promise.all(usernames.map(async (username) => {
        try {
          // You'll need to implement fetchUserProfile or use your existing method
          const response = await fetch(`/api/users/${encodeURIComponent(username)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            profileData[username] = userData;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${username}:`, error);
        }
      }));

      setUserProfiles(profileData);

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

  // Load community posts
  const loadPosts = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `/api/community-posts?username=${encodeURIComponent(username)}&page=${currentPage}&limit=10`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch community posts: Status ${response.status}`);
      }

      const data = await response.json();
      const newPosts = data.posts || [];

      const postsWithUpdatedProfiles = await fetchUserProfiles(newPosts);

      if (reset) {
        setPosts(postsWithUpdatedProfiles);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...postsWithUpdatedProfiles]);
      }

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

  useEffect(() => {
    if (username) {
      loadPosts(true);
    } else {
      setError('User information not available');
      setLoading(false);
    }
  }, [username]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadPosts();
    }
  };

  // Handle voting on a post
  const handleVote = async (postId, voteValue) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/community-posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote: voteValue })
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error voting on post:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading community posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => loadPosts(true)}>Retry</button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <p>This user hasn't posted in the community yet</p>
      </div>
    );
  }

  return (
    <div className={styles.communityTabContainer}>
      <div className={styles.postsContainer}>
        {posts.map(post => (
          <CommunityPost
            key={post.id || post._id}
            post={post}
            onVote={handleVote}
          />
        ))}
      </div>

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button
            className={styles.loadMoreButton}
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunityTab;