import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CommunityTab.module.css';
import { ReportModal, submitReport } from '@/components/report'; // Import ReportModal and submitReport

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

const CommunityPost = ({ post, onHide }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  // Add state for vote tracking
  const [voteCount, setVoteCount] = useState(post.voteCount || 0);
  const [userVote, setUserVote] = useState(0); // 0 = no vote, 1 = upvote, -1 = downvote
  // Add state for report modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  // Add state for hide status
  const [hideStatus, setHideStatus] = useState({ loading: false, success: false, error: null });
  // Add state for text expansion
  const [isExpanded, setIsExpanded] = useState(false);
  // Ref to check text content height
  const textRef = useRef(null);
  // State to track if content needs expand button
  const [needsExpand, setNeedsExpand] = useState(false);

  // Toggle expanded state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if content overflows 2 lines
  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      // Element line height * 2 lines = max height for 2 lines
      const lineHeight = parseInt(getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * 2;

      // If scrollHeight is greater than the height for 2 lines, content needs expand button
      if (element.scrollHeight > maxHeight) {
        setNeedsExpand(true);
      } else {
        setNeedsExpand(false);
      }
    }
  }, [post.content]);

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

  // Implementation of vote handler
  const handleVote = async (value) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        alert('Please log in to vote');
        return;
      }

      // Calculate the vote change
      let voteChange = 0;

      // If user is clicking the same button they already selected, they're removing their vote
      if (userVote === value) {
        // Removing vote: reverse the previous vote effect
        voteChange = -value; // -1 becomes +1, +1 becomes -1

        // Update UI optimistically
        setVoteCount(prevCount => prevCount + voteChange);
        setUserVote(0);

        // API value for removing vote is 0
        value = 0;
      } else {
        // If user had previously voted the opposite way, need to account for that
        if (userVote !== 0) {
          // First remove the effect of the previous vote
          voteChange = -userVote;
        }

        // Then add the effect of the new vote
        voteChange += value;

        // Update UI optimistically
        setVoteCount(prevCount => prevCount + voteChange);
        setUserVote(value);
      }

      console.log(`Sending vote: ${value} for post: ${post.id} (vote change: ${voteChange})`);

      const response = await fetch(`/api/community-posts/${post.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote: value })
      });

      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('Vote response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        // Revert the optimistic UI update on error
        setVoteCount(prevCount => prevCount - voteChange);
        setUserVote(userVote);
        return;
      }

      if (response.ok) {
        // Update with the actual server count
        console.log(`Vote succeeded. Server vote count: ${data.voteCount}`);
        setVoteCount(data.voteCount);
        setUserVote(data.userVote || value);
      } else {
        console.error('Vote failed:', data.message);
        // Revert the optimistic UI update on error
        setVoteCount(prevCount => prevCount - voteChange);
        setUserVote(userVote);
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Revert any optimistic UI updates
      alert('Failed to register your vote. Please try again.');
    }
  };

  // Menu option handlers
  const handleSave = () => {
    console.log(`Saved: ${post.title || 'post'}`);
    setIsMenuOpen(false);
  };

  // Updated hide handler that calls the API
  const handleHide = async () => {
    try {
      setHideStatus({ loading: true, success: false, error: null });
      setIsMenuOpen(false);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call the hide API
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: post.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to hide post');
      }

      // Set success state
      setHideStatus({ loading: false, success: true, error: null });

      // Call the parent handler to remove this post from the UI
      if (onHide) {
        // Show success message briefly before removing from UI
        setTimeout(() => {
          onHide(post.id);
        }, 1000);
      }

    } catch (error) {
      console.error('Error hiding post:', error);
      setHideStatus({ loading: false, success: false, error: error.message });

      // Clear error after 3 seconds
      setTimeout(() => {
        setHideStatus({ loading: false, success: false, error: null });
      }, 3000);
    }
  };

  const handleReport = () => {
    console.log(`Reported: ${post.title || 'post'}`);
    setIsMenuOpen(false);
    setIsReportModalOpen(true); // Open the report modal
  };

  // Handle report submission
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

  return (
    <div className={styles.postCard}>
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.username ? (
              <>
                {/* Check if we have a profile picture from the post or need to fetch it */}
                {(post.avatarSrc && post.avatarSrc !== '/profile-placeholder.jpg' && post.avatarSrc !== '/api/placeholder/64/64') ? (
                  <Image
                    src={post.avatarSrc}
                    alt={`${post.username}'s avatar`}
                    width={32}
                    height={32}
                    className={styles.avatar}
                    priority
                    unoptimized
                    key={post.avatarSrc} // Force re-render when URL changes
                  />
                ) : (
                  <UserAvatar username={post.username} />
                )}
              </>
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ backgroundColor: generateColorFromUsername(post.username || 'user') }}
              >
                <span className={styles.avatarInitial}>U</span>
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
                className={styles.dropdownItem}
                onClick={handleHide}
                disabled={hideStatus.loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <span>{hideStatus.loading ? 'Hiding...' : 'Hide'}</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={handleReport}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.postContent}>
        {/* Post Title */}
        {post.title && (
          <h3 className={styles.postTitle}>{post.title}</h3>
        )}

        {/* Post text with expand/collapse functionality */}
        <p
          ref={textRef}
          className={`${styles.postText} ${isExpanded ? styles.postTextExpanded : ''}`}
        >
          {post.content}
        </p>

        {/* Show more/less button - only displayed if content exceeds 2 lines */}
        {needsExpand && (
          <button
            className={styles.toggleButton}
            onClick={toggleExpand}
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
            />
          </div>
        )}
      </div>

      <div className={styles.postFooter}>
        <div className={styles.voteControls}>
          <button
            className={`${styles.upvoteButton} ${userVote === 1 ? styles.active : ''}`}
            onClick={() => handleVote(1)}
            aria-label="Upvote"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L3 15H21L12 4Z" fill="currentColor" />
            </svg>
          </button>
          <span className={styles.voteCount}>{voteCount}</span>
          <button
            className={`${styles.downvoteButton} ${userVote === -1 ? styles.active : ''}`}
            onClick={() => handleVote(-1)}
            aria-label="Downvote"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20L3 9H21L12 20Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <button className={styles.actionButton}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Report Modal component */}
      {isReportModalOpen && (
        <div
          className={styles.modalWrapper}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
        >
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            onSubmit={handleReportSubmit}
            contentDetails={{
              postId: post.id,
              userId: post.userId,
              username: post.username,
              title: post.title || 'Community Post',
              content: post.content || '',
              hashtags: post.hashtags || [],
              image: post.image || null
            }}
          />
        </div>
      )}
    </div>
  );
};

const CommunityTab = ({ username }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState([]); // Track hidden post IDs

  // Handler for hiding posts
  const handleHidePost = (postId) => {
    // Add to hidden posts list
    setHiddenPostIds(prev => [...prev, postId]);

    // Remove post from the displayed list
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  useEffect(() => {
    const fetchCommunityPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // First, fetch hidden posts to filter them out later
        let hiddenIds = [];
        if (token) {
          try {
            const hiddenResponse = await fetch('/api/posts/hidden', { headers });

            if (hiddenResponse.ok) {
              const hiddenData = await hiddenResponse.json();
              hiddenIds = hiddenData.hiddenPosts.map(hp => hp.postId);
              setHiddenPostIds(hiddenIds);
              console.log('Fetched hidden posts:', hiddenIds);
            }
          } catch (hiddenError) {
            console.error('Error fetching hidden posts:', hiddenError);
          }
        }

        // Safe encoding of username
        const encodedUsername = encodeURIComponent(username);
        console.log(`Fetching community posts for user: ${username} (encoded: ${encodedUsername})`);

        // Get any URL parameters from the page
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');

        // Add ID to URL if available for more reliable lookup
        // Also add includeProfilePictures=true to get profile pictures
        let apiUrl = `/api/users/${encodedUsername}/community?includeProfilePictures=true`;
        if (userId) {
          apiUrl += `&id=${userId}`;
        }

        const response = await fetch(apiUrl, { headers });
        console.log('Community API Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Community API Error:', errorText);
          try {
            const errorJson = JSON.parse(errorText);
            setError(errorJson.message || 'Failed to load community posts');
          } catch (e) {
            setError('Failed to load community posts. Please try again later.');
          }
          setPosts([]);
        } else {
          const data = await response.json();
          console.log('Community posts data received:', data);

          if (data.canViewCommunity === false) {
            setError('This user\'s community posts are private');
            setPosts([]);
          } else {
            // Filter out hidden posts
            const filteredPosts = (data.communityPosts || []).filter(post =>
              !hiddenIds.includes(post.id)
            );

            console.log(`Displaying ${filteredPosts.length} posts after filtering out ${hiddenIds.length} hidden posts`);
            setPosts(filteredPosts);
          }
        }
      } catch (error) {
        console.error('Error fetching community posts:', error);
        setError('Failed to load community posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (username) fetchCommunityPosts();
  }, [username]);

  if (isLoading) {
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
            key={post.id}
            post={post}
            onHide={handleHidePost}
          />
        ))}
      </div>
    </div>
  );
};

export default CommunityTab;