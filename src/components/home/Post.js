'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Post.module.css';
import PostSaveModal from './PostSaveModal';
import { ReportModal, submitReport } from '@/components/report';
import { ShareModal } from '@/components/share';

export default function Post({ post, onHidePost }) {
  const router = useRouter();
  const [showFullContent, setShowFullContent] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAllHashtags, setShowAllHashtags] = useState(false);
  const [hashtagsOverflow, setHashtagsOverflow] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [hideSuccess, setHideSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Video playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [videoError, setVideoError] = useState(false);

  const menuRef = useRef(null);
  const hashtagsContainerRef = useRef(null);

  // Content truncation for longer posts
  const MAX_CONTENT_LENGTH = 150;
  const isContentLong = post.content?.length > MAX_CONTENT_LENGTH;
  const displayContent = showFullContent || !isContentLong
    ? post.content
    : `${post.content?.substring(0, MAX_CONTENT_LENGTH)}...`;

  // Use hashtags from post or fallback to defaults
  const hashtags = post.hashtags && post.hashtags.length > 0
    ? post.hashtags
    : [];

  // Number of visible hashtags before "Show more" button
  const visibleHashtagCount = showAllHashtags ? hashtags.length : calculateVisibleCount();

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;
    
    try {
      // Comprehensive regex that handles all YouTube URL formats
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

  // Handle play button click
  const handlePlayClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (videoId) {
      setIsVideoPlaying(true);
      setVideoError(false);
    }
  }, [videoId]);

  // Handle closing video (return to thumbnail)
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

  // Fetch current user data when component mounts
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);

          // Improved comparison - convert IDs to strings before comparing
          const currentUserId = String(userData._id || userData.id || '');
          const postUserId = String(post.userId || '');

          // Check if post creator is current user
          const isCreator =
            (currentUserId && postUserId && currentUserId === postUserId) ||
            (userData.username && post.username && userData.username === post.username);

          setIsCurrentUser(isCreator);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, [post.userId, post.username]);

  // Calculate number of hashtags visible in first line
  function calculateVisibleCount() {
    return Math.min(3, hashtags.length);
  }

  // Check if hashtags overflow one line
  useEffect(() => {
    setHashtagsOverflow(hashtags.length > calculateVisibleCount());
  }, [hashtags]);

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

  // Handle saving post to playlist
  const handleSaveToPlaylist = (saveData) => {
    setSaveSuccess(true);
    setSavedPlaylistName(saveData.playlistTitle);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
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

  // Hashtag handler
  const handleHashtagClick = (hashtag) => {
    console.log(`Clicked hashtag: ${hashtag}`);
    // Here you would typically navigate to a search or filter view
  };

  // Toggle show all hashtags
  const toggleShowAllHashtags = () => {
    setShowAllHashtags(!showAllHashtags);
  };

  // Add handler for discussion button click
  const handleDiscussionClick = useCallback(() => {
    // Directly check if post is empty
    if (!post || Object.keys(post).length === 0) {
      console.error('Empty post object received');
      return;
    }

    // Try multiple ID formats with detailed logging
    const postId = post.id || post._id;

    if (!postId) {
      console.error('No post ID available');
      return;
    }

    router.push(`/discussion?id=${postId}`);
  }, [post, router]);

  // Handler for username click
  const handleUsernameClick = (e) => {
    e.preventDefault();

    if (isCurrentUser) {
      // Redirect to current user profile
      router.push(`/currentprofile/${post.username}`);
    } else {
      // Redirect to other user profile
      router.push(`/otheruserprofile/${post.username}`);
    }
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const generateColorFromUsername = (username) => {
    if (!username) return '#3b5fe2';

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

  return (
    <div className={styles.postCard}>
      {/* User Info and Post Header */}
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.userImage && post.userImage !== '/profile-placeholder.jpg' ? (
              <Image
                src={post.userImage}
                alt={post.username}
                width={40}
                height={40}
                className={styles.avatarImage}
                priority
                unoptimized
                key={post.userImage}
              />
            ) : post.userId?.profilePicture && post.userId.profilePicture !== '/profile-placeholder.jpg' ? (
              <Image
                src={post.userId.profilePicture}
                alt={post.username}
                width={40}
                height={40}
                className={styles.avatarImage}
                priority
                unoptimized
                key={post.userId.profilePicture}
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
            <a
              href="#"
              className={styles.username}
              onClick={handleUsernameClick}
            >
              {post.username}
            </a>
            <span className={styles.postDate}>{post.timeAgo || post.date}</span>
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

      {/* Post Title and Content */}
      <h2 className={styles.postTitle}>{post.title}</h2>
      <p className={styles.postContent}>
        {displayContent}
        {isContentLong && (
          showFullContent ? (
            <button
              className={styles.readMoreBtn}
              onClick={() => setShowFullContent(false)}
              aria-expanded="true"
            >
              Read less
            </button>
          ) : (
            <button
              className={styles.readMoreBtn}
              onClick={() => setShowFullContent(true)}
              aria-expanded="false"
            >
              Read more
            </button>
          )
        )}
      </p>

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
          <div className={styles.postImageWrapper}>
            <Image
              src={post.image || "/api/placeholder/600/300"}
              alt={post.title}
              width={600}
              height={300}
              className={styles.postImage}
              priority
              unoptimized
              key={`post-image-${post.id || post._id}-${post.image}`}
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
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hashtags Section with inline Show More button */}
      {hashtags.length > 0 && (
        <div className={styles.hashtagsWrapper}>
          <div
            className={`${styles.hashtagsContainer} ${showAllHashtags ? styles.expanded : styles.collapsed}`}
            ref={hashtagsContainerRef}
          >
            {/* Render visible hashtags */}
            {hashtags.slice(0, visibleHashtagCount).map((tag, index) => (
              <button
                key={index}
                className={styles.hashtag}
                onClick={() => handleHashtagClick(tag)}
              >
                {tag}
              </button>
            ))}

            {/* Show "Show more" button inline if there's overflow */}
            {hashtagsOverflow && !showAllHashtags && (
              <div className={styles.showMoreContainer}>
                <button
                  className={styles.showMoreHashtags}
                  onClick={toggleShowAllHashtags}
                >
                  Show more
                </button>
              </div>
            )}

            {/* Render remaining hashtags when expanded */}
            {showAllHashtags && hashtags.slice(visibleHashtagCount).map((tag, index) => (
              <button
                key={index + visibleHashtagCount}
                className={styles.hashtag}
                onClick={() => handleHashtagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Show "Show less" button at the end when expanded */}
          {hashtagsOverflow && showAllHashtags && (
            <button
              className={styles.showMoreHashtags}
              onClick={toggleShowAllHashtags}
              style={{ marginTop: '8px' }}
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Post Engagement */}
      <div className={styles.postEngagement}>
        <button
          className={styles.discussionsBtn}
          onClick={handleDiscussionClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.discussions} Discussions</span>
        </button>

        <button className={styles.shareBtn} onClick={handleShareClick}>
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postData={{
          id: post.id || post._id,
          title: post.title,
          content: post.content || post.description
        }}
      />

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          contentDetails={{
            postId: post.id || post._id,
            userId: post.userId,
            username: post.username,
            title: post.title || 'Untitled',
            content: (post.content || post.description || '').toString(),
            hashtags: post.hashtags || [],
            image: post.image
          }}
        />
      )}

      {/* Post Save Modal */}
      <PostSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        post={post}
        onSave={handleSaveToPlaylist}
      />
    </div>
  );
}