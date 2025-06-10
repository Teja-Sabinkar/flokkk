'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import useRouter
import styles from './HomeTab.module.css';
import PostSaveModal from '@/components/home/PostSaveModal';
import ShareModal from '@/components/share/ShareModal';
import { ReportModal, submitReport } from '@/components/report';
import AddtoModal from './AddtoModal';


const Post = ({ post, onHidePost }) => {
  const router = useRouter(); // Initialize router
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState('');
  const [hideSuccess, setHideSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isAddtoModalOpen, setIsAddtoModalOpen] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addedForumName, setAddedForumName] = useState('');
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

  // Menu option handlers
  const handleSave = () => {
    setIsMenuOpen(false);
    setIsSaveModalOpen(true);
  };

  // Handle share button click
  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // Handle discussions button click - redirect to discussion page
  const handleDiscussionClick = () => {
    const postId = post.id || post._id;
    router.push(`/discussion?id=${postId}`);
  };

  // Implement the hide functionality
  const handleHide = async () => {
    setIsMenuOpen(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to hide posts');
        return;
      }

      const postId = post.id || post._id;

      // Call API to hide the post
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId })
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
          onHidePost(postId);
        }
      }, 1500);

    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post. Please try again.');
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

      // Hide success message after 3 seconds
      setTimeout(() => {
        setReportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  // Handle saving post to playlist
  const handleSaveToPlaylist = (saveData) => {
    console.log(`Post saved to ${saveData.isNewPlaylist ? 'new' : 'existing'} playlist: ${saveData.playlistTitle}`);
    setSaveSuccess(true);
    setSavedPlaylistName(saveData.playlistTitle);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
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

  const handleAddTo = () => {
    setIsMenuOpen(false);
    setIsAddtoModalOpen(true);
  };

  // Add handler for completing the add to forum operation
  const handleAddToForum = (addData) => {
    console.log(`Post added to ${addData.isNewForum ? 'new' : 'existing'} forum: ${addData.forumTitle}`);
    setAddSuccess(true);
    setAddedForumName(addData.forumTitle);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setAddSuccess(false);
    }, 3000);
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
          <div className={styles.nameDate}>
            <span className={styles.username}>
              {post.username}
            </span>
            <span className={styles.postDate}>{post.timeAgo}</span>
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
              <button
                className={styles.dropdownItem}
                onClick={handleSave}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>

              <button
                className={styles.dropdownItem}
                onClick={handleAddTo}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9"></path>
                  <path d="M4 4a16 16 0 0 1 16 16"></path>
                  <circle cx="5" cy="19" r="2"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="19" cy="5" r="2"></circle>
                </svg>
                <span>Add To</span>
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


      {isAddtoModalOpen && (
        <AddtoModal
          isOpen={isAddtoModalOpen}
          onClose={() => setIsAddtoModalOpen(false)}
          post={post}
          onAdd={handleAddToForum}
        />
      )}


      {post.image && (
        <div className={styles.postImageContainer}>
          <div className={styles.postImageWrapper}>
            <Image
              src={post.image}
              alt={post.title}
              width={600}
              height={300}
              className={styles.postImage}
              unoptimized
              priority
              key={`home-tab-image-${post.id || post._id}-${post.image}`} // Force re-render when image changes
            />
          </div>
        </div>
      )}

      <div className={styles.postEngagement}>
        {/* Modified discussions button to redirect to discussion page */}
        <button className={styles.discussionsBtn} onClick={handleDiscussionClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.discussions || post.discussionsCount || 0} Discussions</span>
        </button>

        {/* NEW: Links display (non-interactive) */}
        <div className={styles.linksDisplay}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>{((post.creatorLinks?.length || 0) + (post.communityLinks?.length || 0))} Links</span>
        </div>

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

      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          postData={post}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          contentDetails={{
            postId: post.id || post._id,
            userId: post.userId,
            username: post.username,
            title: post.title,
            content: post.content || post.description,
            hashtags: post.hashtags,
            image: post.image
          }}
        />
      )}

      <PostSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        post={post}
        onSave={handleSaveToPlaylist}
      />
    </div>
  );
};

const HomeTab = ({ username }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!username) {
          throw new Error('No username provided');
        }

        // Get token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // First fetch hidden posts
        let hiddenIds = [];
        try {
          const hiddenResponse = await fetch('/api/posts/hidden', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (hiddenResponse.ok) {
            const hiddenData = await hiddenResponse.json();
            hiddenIds = hiddenData.hiddenPosts.map(hp => hp.postId);
            setHiddenPostIds(hiddenIds);
          }
        } catch (hiddenError) {
          console.error('Error fetching hidden posts:', hiddenError);
          // Continue even if hidden posts can't be fetched
        }

        // Get current user info first
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get current user info');
        }

        const userData = await userResponse.json();
        console.log('Current user data:', userData);

        // Use the correct endpoint for fetching user posts
        const encodedUsername = encodeURIComponent(username);

        // Add user ID as a query parameter if available
        let url = `/api/users/${encodedUsername}/posts`;
        if (userData && userData.id) {
          url += `?id=${userData.id}`;
        }

        console.log('Fetching from URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log(`API response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('User posts API response:', data);

        // Use the posts from the response and filter out hidden posts
        if (data && data.posts) {
          const filteredPosts = data.posts.filter(post => {
            const postId = post.id || post._id;
            return !hiddenIds.includes(postId?.toString());
          });

          setPosts(filteredPosts);
        } else {
          console.warn('Unexpected API response format:', data);
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError(error.message || 'Failed to load posts');
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchPosts();
    } else {
      setIsLoading(false);
      setError('No username provided');
    }
  }, [username]);

  // Event listener for post creation
  useEffect(() => {
    const handlePostCreated = (event) => {
      console.log('Post created event received:', event.detail.post);
      const newPost = event.detail.post;
      setPosts(prevPosts => [newPost, ...prevPosts]);
    };

    window.addEventListener('post-created', handlePostCreated);

    return () => {
      window.removeEventListener('post-created', handlePostCreated);
    };
  }, []);

  // Handler for hiding posts
  const handleHidePost = (postId) => {
    // Add to local hidden posts
    setHiddenPostIds(prev => [...prev, postId]);

    // Remove the post from the UI
    setPosts(prevPosts => prevPosts.filter(post =>
      (post.id !== postId && post._id !== postId)
    ));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading posts...</p>
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
      <div className={styles.emptyState}>
        <p>No posts created yet. Lets create your first discussion to view posts here.</p>
      </div>
    );
  }

  return (
    <div className={styles.homeTabContainer}>
      {posts.map(post => (
        <Post
          key={post.id || post._id}
          post={post}
          onHidePost={handleHidePost}
        />
      ))}
    </div>
  );
};

export default HomeTab;