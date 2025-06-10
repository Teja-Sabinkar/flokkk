// ForumsTabDiscussions.js - COMPLETE UPDATED FILE
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ForumsTabDiscussions.module.css';
import { ReportModal, submitReport } from '@/components/report';
import { useRouter } from 'next/navigation';
import ShareModal from '@/components/share/ShareModal';
import { useAppearanceTracker } from '@/hooks/useAppearanceTracker';

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

// Function to fetch comment counts for posts
const fetchCommentCounts = async (postsArray) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return postsArray;

    const commentCountPromises = postsArray.map(async (post) => {
      try {
        const postId = post.id || post._id;
        const response = await fetch(`/api/posts/${postId}/comments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const commentsData = await response.json();
          const totalComments = countTotalComments(commentsData.comments || []);
          return {
            ...post,
            commentsCount: totalComments
          };
        } else {
          console.warn(`Failed to fetch comments for post ${postId}`);
          return {
            ...post,
            commentsCount: 0
          };
        }
      } catch (error) {
        console.error(`Error fetching comments for post ${post.id || post._id}:`, error);
        return {
          ...post,
          commentsCount: 0
        };
      }
    });

    const postsWithCommentCounts = await Promise.all(commentCountPromises);
    return postsWithCommentCounts;
  } catch (error) {
    console.error('Error fetching comment counts:', error);
    return postsArray;
  }
};

// Helper function to count total comments including nested replies
const countTotalComments = (comments) => {
  let total = 0;
  
  const countReplies = (commentArray) => {
    commentArray.forEach(comment => {
      total++;
      if (comment.replies && comment.replies.length > 0) {
        countReplies(comment.replies);
      }
    });
  };
  
  countReplies(comments);
  return total;
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

  // Implement hide functionality
  const handleHide = async () => {
    setIsMenuOpen(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to hide posts');
        return;
      }

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

      setHideSuccess(true);
      setTimeout(() => {
        setHideSuccess(false);
        if (onHidePost) {
          onHidePost(post.id || post._id);
        }
      }, 1500);

    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post. Please try again.');
    }
  };

  // Handle remove functionality
  const handleRemovePost = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);

    setRemoveSuccess(true);

    if (onRemovePost) {
      onRemovePost(post.id || post._id)
        .then(() => {
          setTimeout(() => {
            setRemoveSuccess(false);
          }, 1500);
        })
        .catch(error => {
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

  // Handle discussion click with penetrate tracking
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

  // Handle share with tracking
  const handleShare = async () => {
    setIsShareModalOpen(true);
    
    // Track share engagement
    const postId = post.id || post._id;
    await trackShareEngagement(postId);
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
    <div className={styles.postCard} ref={postRef} data-post-id={post.id || post._id}>
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
                key={`forum-discussion-image-${post.id || post._id}-${post.image}`}
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
        <button className={styles.commentsBtn} onClick={handleDiscussionClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.commentsCount?.toString() || post.discussions?.toString() || '0'} Discussions</span>
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
      {hideSuccess && (
        <div className={styles.successMessage}>
          Post hidden successfully.
        </div>
      )}

      {removeSuccess && (
        <div className={styles.successMessage}>
          Post removed successfully.
        </div>
      )}

      {reportSuccess && (
        <div className={styles.successMessage}>
          Report submitted successfully.
        </div>
      )}

      {/* Modals */}
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
  const forumRef = useRef(forum);
  const [postCount, setPostCount] = useState(forum?.postCount || 0);

  const pendingUpdateRef = useRef(null);

  useEffect(() => {
    if (pendingUpdateRef.current && onForumUpdate) {
      const updatedForum = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      setTimeout(() => {
        onForumUpdate(updatedForum);
      }, 0);
    }
  }, [postCount, onForumUpdate]);

  const handleHidePost = (postId) => {
    setHiddenPostIds(prev => [...prev, postId]);
    setPosts(prevPosts => {
      const newPosts = prevPosts.filter(post =>
        (post.id !== postId && post._id !== postId)
      );

      setPostCount(newPosts.length);

      pendingUpdateRef.current = {
        ...forumRef.current,
        postCount: newPosts.length
      };

      return newPosts;
    });
  };

  const handleRemovePost = async (postId) => {
    try {
      console.log('Removing post with ID:', postId, 'from forum:', forumRef.current.id);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

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

      setPosts(prevPosts => {
        const filteredPosts = prevPosts.filter(post => {
          const currentPostId = post.id || post._id;
          return currentPostId.toString() !== postId.toString();
        });

        console.log(`Post removed successfully. Posts count: ${prevPosts.length} → ${filteredPosts.length}`);

        const newPostCount = filteredPosts.length;
        setPostCount(newPostCount);

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

  const fetchUserProfiles = async (postsArray) => {
    try {
      const usernames = [...new Set(postsArray.map(post => post.username))];

      const profileData = {};

      await Promise.all(usernames.map(async (username) => {
        const profile = await fetchUserProfile(username);
        if (profile) {
          profileData[username] = profile;
        }
      }));

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

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

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

        if (data.posts && Array.isArray(data.posts)) {
          try {
            const hiddenResponse = await fetch('/api/posts/hidden', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (hiddenResponse.ok) {
              const hiddenData = await hiddenResponse.json();
              const hiddenIds = hiddenData.hiddenPosts.map(hp => hp.postId);
              setHiddenPostIds(hiddenIds);

              const filteredPosts = data.posts.filter(post => {
                const postId = post.id || post._id;
                return !hiddenIds.includes(postId);
              });

              const postsWithProfiles = await fetchUserProfiles(filteredPosts);
              
              console.log('Fetching comment counts for', postsWithProfiles.length, 'posts...');
              const postsWithCommentCounts = await fetchCommentCounts(postsWithProfiles);
              console.log('Comment counts fetched successfully');
              
              setPosts(postsWithCommentCounts);

              const newPostCount = filteredPosts.length;
              setPostCount(newPostCount);

              pendingUpdateRef.current = {
                ...forumRef.current,
                postCount: newPostCount
              };
            } else {
              const postsWithProfiles = await fetchUserProfiles(data.posts);
              
              console.log('Fetching comment counts for', postsWithProfiles.length, 'posts...');
              const postsWithCommentCounts = await fetchCommentCounts(postsWithProfiles);
              console.log('Comment counts fetched successfully');
              
              setPosts(postsWithCommentCounts);

              const newPostCount = data.posts.length;
              setPostCount(newPostCount);

              pendingUpdateRef.current = {
                ...forumRef.current,
                postCount: newPostCount
              };
            }
          } catch (hiddenError) {
            console.error('Error fetching hidden posts:', hiddenError);
            const postsWithProfiles = await fetchUserProfiles(data.posts);
            
            console.log('Fetching comment counts for', postsWithProfiles.length, 'posts...');
            const postsWithCommentCounts = await fetchCommentCounts(postsWithProfiles);
            console.log('Comment counts fetched successfully');
            
            setPosts(postsWithCommentCounts);

            const newPostCount = data.posts.length;
            setPostCount(newPostCount);

            pendingUpdateRef.current = {
              ...forumRef.current,
              postCount: newPostCount
            };
          }
        } else {
          setPosts([]);

          setPostCount(0);

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