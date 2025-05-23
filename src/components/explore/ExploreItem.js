// src/components/explore/ExploreItem.js - Updated with appearance tracking
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ExploreItem.module.css';
import PostSaveModal from '../home/PostSaveModal';
import ReportModal from '../report/ReportModal';
import ShareModal from '../share/ShareModal';
import { submitReport } from '../../components/report/reportService';
import { useAppearanceTracker } from '@/hooks/useAppearanceTracker';

const ExploreItem = ({ username, timeAgo, title, description, imageUrl, discussionCount, profilePicture, id, onHide, videoUrl }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [isHiding, setIsHiding] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Video playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [videoError, setVideoError] = useState(false);

  const menuRef = useRef(null);

  // NEW: Use appearance tracking hook
  const { elementRef: itemRef, hasAppeared } = useAppearanceTracker(id, {
    threshold: 0.5, // 50% visibility
    timeThreshold: 1000 // 1 second
  });

  // Track view engagement with the post
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

  // Track penetrate engagement with the post
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

  // Extract YouTube video ID from URL - Same logic as Post.js
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

  // Extract video ID when component mounts or videoUrl changes - Same as Post.js
  useEffect(() => {
    if (videoUrl) {
      const id = extractYouTubeVideoId(videoUrl);
      setVideoId(id);
    } else {
      setVideoId(null);
    }
  }, [videoUrl, extractYouTubeVideoId]);

  // Handle play button click - NOW WITH VIEW TRACKING
  const handlePlayClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (videoId) {
      setIsVideoPlaying(true);
      setVideoError(false);

      // Track view engagement when play button is clicked
      await trackViewEngagement(id);
    }
  }, [videoId, id]);

  // Handle closing video (return to thumbnail) - Same as Post.js
  const handleCloseVideo = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoPlaying(false);
    setVideoError(false);
  }, []);

  // Handle video embedding error - Same as Post.js
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
  const handleSave = () => {
    setIsMenuOpen(false);
    setIsSaveModalOpen(true);
  };

  const handleHide = async () => {
    try {
      setIsMenuOpen(false);
      setIsHiding(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to hide post');
      }

      setIsHidden(true);

      if (typeof onHide === 'function') {
        onHide(id);
      }

      console.log(`Hidden: ${title} (ID: ${id})`);
    } catch (error) {
      console.error('Error hiding post:', error);
    } finally {
      setIsHiding(false);
    }
  };

  const handleReport = () => {
    setIsMenuOpen(false);
    setIsReportModalOpen(true);
  };

  const handleReportModalClose = () => {
    setIsReportModalOpen(false);
    setReportError(null);
  };

  const handleReportSubmit = async (reportData) => {
    try {
      setIsReporting(true);
      setReportError(null);

      await submitReport(reportData);
      setIsReportModalOpen(false);

      console.log(`Report submitted for post "${title}"`);
    } catch (error) {
      console.error('Error submitting report:', error);
      setReportError(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
  };

  const handleDiscussionsClick = async () => {
    // Track penetrate engagement when discussion button is clicked
    await trackPenetrateEngagement(id);

    router.push(`/discussion?id=${id}`);
  };

  const handleSaveModalClose = () => {
    setIsSaveModalOpen(false);
  };

  const handleSaveSuccess = (saveResult) => {
    console.log(`Saved post "${title}" to playlist: ${saveResult.playlistTitle}`);
    setIsSaveModalOpen(false);
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

  const postData = {
    id: id,
    title: title,
    description: description,
    content: description,
    image: imageUrl,
    username: username
  };

  const contentDetails = {
    postId: id,
    userId: null,
    username: username,
    title: title,
    content: description,
    image: imageUrl,
    hashtags: [],
    reportedAt: new Date().toISOString()
  };

  const sharePostData = {
    id: id,
    title: title,
    content: description,
    username: username
  };

  const hasProfilePicture = profilePicture && profilePicture !== '/profile-placeholder.jpg';

  if (isHidden) {
    return null;
  }

  return (
    <div className={styles.item} ref={itemRef} data-post-id={id}>


      {/* User Info and Item Header */}
      <div className={styles.itemHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {hasProfilePicture ? (
              <Image
                src={profilePicture}
                alt={`${username}'s profile`}
                width={32}
                height={32}
                className={styles.avatarImage}
                priority
                unoptimized
                key={profilePicture}
              />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{
                  backgroundColor: generateColorFromUsername(username)
                }}
              >
                <span>{username.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className={styles.nameDate}>
            <Link href={`/otheruserprofile/${username}`} className={styles.username}>
              {username}
            </Link>
            <span className={styles.timeAgo}>{timeAgo} ago</span>
          </div>
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.menuButton}
            aria-label="Item menu"
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
              <button className={styles.dropdownItem} onClick={handleSave}>
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
                disabled={isHiding}
              >
                {isHiding ? (
                  <>
                    <div className={styles.spinnerSmall}></div>
                    <span>Hiding...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                    <span>Hide</span>
                  </>
                )}
              </button>
              <button className={styles.dropdownItem} onClick={handleReport}>
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

      <h3 className={styles.itemTitle}>{title}</h3>
      <p className={styles.itemDescription}>{description}</p>

      {/* Updated Image/Video Container - Now matches Post.js exactly */}
      <div className={styles.imageContainer}>
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
              title={title}
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
                href={videoUrl}
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
          // Thumbnail with optional play button - Matches Post.js logic exactly
          <div className={styles.imageWrapper}>
            <Image
              src={imageUrl || "/api/placeholder/600/300"}
              alt={title}
              width={600}
              height={300}
              className={styles.itemImage}
              unoptimized
              priority
              key={`explore-image-${id}-${imageUrl}`}
            />

            {/* Play button overlay for videos - Now matches Post.js exactly */}
            {videoUrl && videoId && (
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
        )}
      </div>

      <div className={styles.itemFooter}>
        <button className={styles.discussionsBtn} onClick={handleDiscussionsClick}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{discussionCount} Discussions</span>
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

      <PostSaveModal
        isOpen={isSaveModalOpen}
        onClose={handleSaveModalClose}
        post={postData}
        onSave={handleSaveSuccess}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={handleReportModalClose}
        onSubmit={handleReportSubmit}
        contentDetails={contentDetails}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose}
        postData={sharePostData}
      />
    </div>
  );
};

export default ExploreItem;