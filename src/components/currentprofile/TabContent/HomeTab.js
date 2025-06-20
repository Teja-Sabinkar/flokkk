// HomeTab.js - COMPLETE UPDATED FILE
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './HomeTab.module.css';
import PostSaveModal from '@/components/home/PostSaveModal';
import ShareModal from '@/components/share/ShareModal';
import { ReportModal, submitReport } from '@/components/report';
import AddtoModal from './AddtoModal';
import { useAppearanceTracker } from '@/hooks/useAppearanceTracker';

const Post = ({ post, onHidePost }) => {
  const router = useRouter();
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

  // Video playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [videoError, setVideoError] = useState(false);

  // Appearance tracking hook
  const { elementRef: postRef, hasAppeared, isTracking, debugInfo, manualTrigger } = useAppearanceTracker(post.id || post._id, {
    threshold: 0.3,
    timeThreshold: 500
  });

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      return match && match[1] ? match[1] : null;
    } catch (error) {
      console.error('Error extracting video ID:', error);
      return null;
    }
  }, []);

  // Extract video ID when component mounts or videoUrl changes
  useEffect(() => {
    if (post.videoUrl) {
      const id = extractYouTubeVideoId(post.videoUrl);
      setVideoId(id);
    } else {
      setVideoId(null);
    }
  }, [post.videoUrl, extractYouTubeVideoId]);

  // Track view engagement
  const trackViewEngagement = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to track view engagement');
      } else {
        const data = await response.json();
        console.log('View engagement tracked:', data);
      }
    } catch (error) {
      console.error('Error tracking view engagement:', error);
    }
  };

  // Track penetrate engagement
  const trackPenetrateEngagement = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-penetrate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to track penetrate engagement');
      } else {
        const data = await response.json();
        console.log('Penetrate engagement tracked:', data);
      }
    } catch (error) {
      console.error('Error tracking penetrate engagement:', error);
    }
  };

  // Track save engagement
  const trackSaveEngagement = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to track save engagement');
      } else {
        const data = await response.json();
        console.log('Save engagement tracked:', data);
      }
    } catch (error) {
      console.error('Error tracking save engagement:', error);
    }
  };

  // Track share engagement
  const trackShareEngagement = async (postId, platform = 'unknown') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform })
      });

      if (!response.ok) {
        console.warn('Failed to track share engagement');
      } else {
        const data = await response.json();
        console.log('Share engagement tracked:', data);
      }
    } catch (error) {
      console.error('Error tracking share engagement:', error);
    }
  };

  // Handle play button click with view tracking
  const handlePlayClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoId) {
      setIsVideoPlaying(true);
      setVideoError(false);

      // Track view engagement when play button is clicked
      const postId = post.id || post._id;
      await trackViewEngagement(postId);
    }
  }, [videoId, post.id, post._id]);

  // Handle closing video
  const handleCloseVideo = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoPlaying(false);
    setVideoError(false);
  }, []);

  // Handle video embedding error
  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

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
  const handleSave = async () => {
    setIsMenuOpen(false);
    setIsSaveModalOpen(true);
    
    // Track save engagement
    const postId = post.id || post._id;
    await trackSaveEngagement(postId);
  };

  // Handle share button click
  const handleShare = async () => {
    setIsShareModalOpen(true);
    
    // Track share engagement
    const postId = post.id || post._id;
    await trackShareEngagement(postId);
  };

  // Handle discussions button click with penetrate tracking
  const handleDiscussionClick = useCallback(async () => {
    if (!post || Object.keys(post).length === 0) {
      console.error('Empty post object received');
      return;
    }

    const postId = post.id || post._id;
    if (!postId) {
      console.error('No post ID available');
      return;
    }

    // Track penetrate engagement when discussion button is clicked
    await trackPenetrateEngagement(postId);

    router.push(`/discussion?id=${postId}`);
  }, [post, router]);

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

      setHideSuccess(true);
      setTimeout(() => {
        setHideSuccess(false);
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

    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
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

  const handleAddTo = () => {
    setIsMenuOpen(false);
    setIsAddtoModalOpen(true);
  };

  const handleAddToForum = (addData) => {
    console.log(`Post added to ${addData.isNewForum ? 'new' : 'existing'} forum: ${addData.forumTitle}`);
    setAddSuccess(true);
    setAddedForumName(addData.forumTitle);

    setTimeout(() => {
      setAddSuccess(false);
    }, 3000);
  };

  return (
    <div className={styles.postCard} ref={postRef} data-post-id={post.id || post._id}>
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

      {/* Post Image/Video Container */}
      <div className={styles.postImageContainer}>
        {isVideoPlaying && videoId && !videoError ? (
          // YouTube video player
          <div className={styles.videoPlayerWrapper}>
            <button
              className={styles.closeVideoButton}
              onClick={handleCloseVideo}
              aria-label="Close video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <iframe
              className={styles.youtubeEmbed}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={post.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={handleVideoError}
            ></iframe>
          </div>
        ) : isVideoPlaying && videoError ? (
          // Error fallback when embedding fails
          <div className={styles.videoErrorContainer}>
            <button
              className={styles.closeVideoButton}
              onClick={handleCloseVideo}
              aria-label="Close video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className={styles.videoErrorContent}>
              <div className={styles.errorIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3>Video cannot be embedded</h3>
              <p>This video cannot be played directly. Click below to watch on YouTube.</p>
              <a
                href={post.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.watchOnYoutubeBtn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Watch on YouTube
              </a>
            </div>
          </div>
        ) : (
          // Thumbnail with optional play button
          post.image && (
            <div className={styles.postImageWrapper}>
              <Image
                src={post.image}
                alt={post.title}
                width={600}
                height={300}
                className={styles.postImage}
                unoptimized
                priority
                key={`home-tab-image-${post.id || post._id}-${post.image}`}
              />

              {/* Play button overlay for videos */}
              {post.videoUrl && videoId && (
                <button
                  className={styles.playButton}
                  onClick={handlePlayClick}
                  aria-label="Play video"
                >
                  <div className={styles.playButtonCircle}>
                    <svg
                      className={styles.playIcon}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          )
        )}
      </div>

      <div className={styles.postEngagement}>
        <button className={styles.discussionsBtn} onClick={handleDiscussionClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.discussions || post.discussionsCount || 0} Discussions</span>
        </button>

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

      {/* Success messages */}
      {saveSuccess && (
        <div className={styles.successMessage}>
          Post saved to "{savedPlaylistName}" playlist!
        </div>
      )}

      {hideSuccess && (
        <div className={styles.successMessage}>
          Post hidden successfully.
        </div>
      )}

      {addSuccess && (
        <div className={styles.successMessage}>
          Post added to "{addedForumName}" forum!
        </div>
      )}

      {reportSuccess && (
        <div className={styles.successMessage}>
          Report submitted successfully.
        </div>
      )}

      {/* Modals */}
      {isAddtoModalOpen && (
        <AddtoModal
          isOpen={isAddtoModalOpen}
          onClose={() => setIsAddtoModalOpen(false)}
          post={post}
          onAdd={handleAddToForum}
        />
      )}

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
    setHiddenPostIds(prev => [...prev, postId]);
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