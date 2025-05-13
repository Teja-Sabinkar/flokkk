'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ForumsTabDiscussions.module.css';
import { ReportModal, submitReport } from '@/components/report';
import { useRouter } from 'next/navigation';
import ShareModal from '@/components/share/ShareModal';

// Move fetchUserProfile outside component for reuse
const fetchUserProfile = async (username) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch(`/api/users/${username}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
    return null;
  }
};

const DiscussionPost = ({ post, onHidePost, onRemovePost }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hideSuccess, setHideSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportContent, setReportContent] = useState(null);
  const [removeSuccess, setRemoveSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Implement hide functionality
  const handleHide = async () => {
    setIsMenuOpen(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to hide posts');
        return;
      }

      // Call API to hide the post
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: post.id || post._id })
      });

      if (!response.ok) {
        throw new Error('Failed to hide post');
      }

      // Show success message temporarily
      setHideSuccess(true);
      setTimeout(() => {
        setHideSuccess(false);

        // Call the parent function to remove this post from UI
        if (onHidePost) {
          onHidePost(post.id || post._id);
        }
      }, 1500);

    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post. Please try again.');
    }
  };

  // Handle remove functionality (similar to PlaylistsTabDiscussions)
  const handleRemovePost = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsMenuOpen(false);

    // Show success message immediately for feedback
    setRemoveSuccess(true);

    // Call the parent handler function
    if (onRemovePost) {
      onRemovePost(post.id || post._id)
        .then(() => {
          // Success is already shown, just keep it visible for a moment
          setTimeout(() => {
            setRemoveSuccess(false);
          }, 1500);
        })
        .catch(error => {
          // Hide the success message if there was an error
          setRemoveSuccess(false);
          console.error('Error removing post:', error);
          alert('Failed to remove post. Please try again.');
        });
    }
  };

  const handleReport = () => {
    setIsMenuOpen(false);
    setReportContent(post);
    setIsReportModalOpen(true);
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

  const handleDiscussionClick = () => {
    const postId = post.id || post._id;
    router.push(`/discussion?id=${postId}`);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
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
            {post.profilePicture && post.profilePicture !== '/profile-placeholder.jpg' ? (
              <Image
                src={post.profilePicture}
                alt={`${post.username}'s profile picture`}
                width={40}
                height={40}
                className={styles.avatarImage}
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
          <div className={styles.nameDate}>
            <Link href={`/otheruserprofile/${post.username}`} className={styles.username}>
              {post.username}
            </Link>
            <span className={styles.postDate}>{post.timeAgo || 'recently'}</span>
          </div>
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.postMenu}
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
              {/* Remove option with matching pattern to PlaylistsTabDiscussions */}
              <button
                className={`${styles.dropdownItem} ${styles.removeDropdownItem}`}
                onClick={handleRemovePost}
                data-testid="remove-post-button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span>Remove</span>
              </button>

              <button
                className={styles.dropdownItem}
                onClick={handleHide}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <span>Hide</span>
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

      <h2 className={styles.postTitle}>{post.title}</h2>
      <p className={styles.postDescription}>{post.content || post.description}</p>

      {post.image && (
        <div className={styles.postImageContainer}>
          <div className={styles.postImageWrapper}>
            <Image
              src={post.image}
              alt={post.title}
              width={600}
              height={300}
              className={styles.postImage}
            />
          </div>
        </div>
      )}

      <div className={styles.postEngagement}>
        <button className={styles.commentsBtn} onClick={handleDiscussionClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.commentsCount || post.discussions || '0'} Comments</span>
        </button>

        <button className={styles.shareBtn} onClick={handleShare}>
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

      {/* Add ShareModal component */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          postData={post}
        />
      )}

      {isReportModalOpen && reportContent && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          contentDetails={{
            postId: reportContent.id || reportContent._id,
            userId: reportContent.userId,
            username: reportContent.username,
            title: reportContent.title,
            content: reportContent.content || reportContent.description,
            hashtags: reportContent.hashtags,
            image: reportContent.image
          }}
        />
      )}
    </div>
  );
};

const ForumsTabDiscussions = ({ forum, onBack, onForumUpdate }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  // Create a stable reference to the forum object to avoid re-renders
  const forumRef = useRef(forum);
  // Use a separate state for post count to avoid dependency loops
  const [postCount, setPostCount] = useState(forum?.postCount || 0);

  // Keep track of updates to inform parent component
  const pendingUpdateRef = useRef(null);

  // Safely notify parent component about updates - using useEffect to prevent render-time updates
  useEffect(() => {
    if (pendingUpdateRef.current && onForumUpdate) {
      const updatedForum = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      // Schedule this after render is complete to avoid React errors
      setTimeout(() => {
        onForumUpdate(updatedForum);
      }, 0);
    }
  }, [postCount, onForumUpdate]);

  // Handle hiding a post
  const handleHidePost = (postId) => {
    setHiddenPostIds(prev => [...prev, postId]);
    setPosts(prevPosts => {
      const newPosts = prevPosts.filter(post =>
        (post.id !== postId && post._id !== postId)
      );

      // Update the post count state
      setPostCount(newPosts.length);

      // Store the update to notify parent component later (in useEffect)
      pendingUpdateRef.current = {
        ...forumRef.current,
        postCount: newPosts.length
      };

      return newPosts;
    });
  };

  // Handle removing a post from the forum - with database update
  const handleRemovePost = async (postId) => {
    try {
      console.log('Removing post with ID:', postId, 'from forum:', forumRef.current.id);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call API to remove post from forum
      const response = await fetch(`/api/forums/${forumRef.current.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          removePostId: postId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to remove post from forum');
      }

      // Update the posts state to remove the post from UI
      setPosts(prevPosts => {
        const filteredPosts = prevPosts.filter(post => {
          const currentPostId = post.id || post._id;
          return currentPostId.toString() !== postId.toString();
        });

        console.log(`Post removed successfully. Posts count: ${prevPosts.length} → ${filteredPosts.length}`);

        // Update post count state
        const newPostCount = filteredPosts.length;
        setPostCount(newPostCount);

        // Store the update to notify parent component later (in useEffect)
        pendingUpdateRef.current = {
          ...forumRef.current,
          postCount: newPostCount
        };

        return filteredPosts;
      });

      return true;
    } catch (error) {
      console.error('Error removing post from forum:', error);
      throw error;
    }
  };

  // Fetch user profiles and update posts with profile pictures
  const fetchUserProfiles = async (postsArray) => {
    try {
      // Get unique usernames from posts
      const usernames = [...new Set(postsArray.map(post => post.username))];

      // Fetch profile data for each unique user
      const profileData = {};

      await Promise.all(usernames.map(async (username) => {
        const profile = await fetchUserProfile(username);
        if (profile) {
          profileData[username] = profile;
        }
      }));

      // Update posts with profile pictures
      return postsArray.map(post => {
        const userProfile = profileData[post.username];
        return {
          ...post,
          profilePicture: userProfile?.profilePicture || post.profilePicture || '/profile-placeholder.jpg'
        };
      });
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      return postsArray;
    }
  };

  // Fetch forum details with posts - only when the forum ID changes
  useEffect(() => {
    const fetchForumDetails = async () => {
      if (!forumRef.current || !forumRef.current.id) {
        console.error('No valid forum ID provided');
        setError('Invalid forum data');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching posts for forum with ID:', forumRef.current.id);

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Fetch posts from the API
        const response = await fetch(`/api/forums/${forumRef.current.id}/posts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error fetching forum posts: Status ${response.status}, Response: ${errorText}`);
          throw new Error(`Failed to load forum posts: ${response.status}`);
        }

        const data = await response.json();

        // Process the posts
        if (data.posts && Array.isArray(data.posts)) {
          // Fetch hidden posts to filter out any hidden posts
          try {
            const hiddenResponse = await fetch('/api/posts/hidden', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (hiddenResponse.ok) {
              const hiddenData = await hiddenResponse.json();
              // Store hidden post IDs
              const hiddenIds = hiddenData.hiddenPosts.map(hp => hp.postId);
              setHiddenPostIds(hiddenIds);

              // Filter out hidden posts
              const filteredPosts = data.posts.filter(post => {
                const postId = post.id || post._id;
                return !hiddenIds.includes(postId);
              });

              // Get profile pictures for posts - this is the new step
              const postsWithProfiles = await fetchUserProfiles(filteredPosts);
              setPosts(postsWithProfiles);

              // Update post count state
              const newPostCount = filteredPosts.length;
              setPostCount(newPostCount);

              // Store the update to notify parent component later (in useEffect)
              pendingUpdateRef.current = {
                ...forumRef.current,
                postCount: newPostCount
              };
            } else {
              // If can't fetch hidden posts, still show all posts
              const postsWithProfiles = await fetchUserProfiles(data.posts);
              setPosts(postsWithProfiles);

              // Update post count state
              const newPostCount = data.posts.length;
              setPostCount(newPostCount);

              // Store the update to notify parent component later (in useEffect)
              pendingUpdateRef.current = {
                ...forumRef.current,
                postCount: newPostCount
              };
            }
          } catch (hiddenError) {
            console.error('Error fetching hidden posts:', hiddenError);
            // Still show posts if hidden posts can't be fetched
            const postsWithProfiles = await fetchUserProfiles(data.posts);
            setPosts(postsWithProfiles);

            // Update post count state
            const newPostCount = data.posts.length;
            setPostCount(newPostCount);

            // Store the update to notify parent component later (in useEffect)
            pendingUpdateRef.current = {
              ...forumRef.current,
              postCount: newPostCount
            };
          }
        } else {
          setPosts([]);

          // Update post count state
          setPostCount(0);

          // Store the update to notify parent component later (in useEffect)
          pendingUpdateRef.current = {
            ...forumRef.current,
            postCount: 0
          };
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching forum details:', err);
        setError(err.message || 'Failed to load forum details');
      } finally {
        setLoading(false);
      }
    };

    fetchForumDetails();
    // Use an empty dependency array to only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>

        <p className={styles.forumPostCount}>posts in forums are visible to other users.</p>

        <button className={styles.backButton} onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Forums</span>
        </button>
        <h1 className={styles.forumTitle}>{forumRef.current.title}</h1>

      </div>

      <div className={styles.discussionsContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading discussions...</p>
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => (
            <DiscussionPost
              key={post.id || post._id}
              post={post}
              onHidePost={handleHidePost}
              onRemovePost={handleRemovePost}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No discussions in this forum yet.</p>
            <p>Be the first to start a discussion!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumsTabDiscussions;