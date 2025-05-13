import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './SubscriptionPostItem.module.css';
import { ReportModal, submitReport } from '@/components/report';
import ShareModal from '@/components/share/ShareModal';
import PostSaveModal from '@/components/home/PostSaveModal'; // Make sure this is imported

const SubscriptionPostItem = ({ post, viewMode = 'grid', onHidePost }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hideSuccess, setHideSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // New state for save modal
  const [saveSuccess, setSaveSuccess] = useState(false); // State to track save success
  const [savedPlaylistName, setSavedPlaylistName] = useState(''); // For success message
  const menuRef = useRef(null);

  // Format date as "time ago" (e.g., "2h ago", "3d ago")
  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);

    // Convert to seconds
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) {
      return `${seconds}sec ago`;
    }

    // Convert to minutes
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}min ago`;
    }

    // Convert to hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}hrs ago`;
    }

    // Convert to days
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}days ago`;
    }

    // Convert to weeks
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}weeks ago`;
    }

    // Convert to months
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mon ago`;
    }

    // Convert to years
    const years = Math.floor(days / 365);
    return `${years}yrs ago`;
  };

  const timeAgo = getTimeAgo(post.createdAt);

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

  // Updated hide function with API call
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

  // Handle share button click
  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  // NEW: Handle save button click
  const handleSave = () => {
    setIsMenuOpen(false);
    setIsSaveModalOpen(true);
  };

  // NEW: Handle saving post to playlist
  const handleSaveToPlaylist = (saveData) => {
    setSaveSuccess(true);
    setSavedPlaylistName(saveData.playlistTitle);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleMenuAction = (action) => {
    setIsMenuOpen(false);

    if (action === 'hide') {
      handleHide();
    } else if (action === 'save') {
      // Use the handleSave function
      handleSave();
    } else if (action === 'report') {
      // Updated to open the report modal
      setIsReportModalOpen(true);
    } else if (action === 'share') {
      // Open share modal
      handleShare();
    }
  };

  // Calculate avatar background color based on username
  const getAvatarColor = (username) => {
    const colors = [
      '#4169E1', '#6E56CF', '#2E7D32', '#D32F2F', '#9C27B0',
      '#1976D2', '#F57C00', '#388E3C', '#7B1FA2', '#C2185B'
    ];

    // Generate a consistent index based on username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Get a positive index in the range of our colors array
    const index = Math.abs(hash % colors.length);
    return colors[index];
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

  // Discussion click handler
  const handleDiscussionClick = (e) => {
    e.preventDefault();
    const postId = post.id || post._id;

    if (!postId) return;

    // Track the view before navigating
    const trackView = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await fetch('/api/recently-viewed/track', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId })
          });
        }
      } catch (error) {
        console.error('Error tracking view:', error);
        // Continue with navigation even if tracking fails
      }
    };

    // Track and navigate
    trackView().then(() => {
      console.log("Navigating to discussion with ID:", postId);
      // Use the correct URL format
      router.push(`/discussion?id=${postId}`);
    });
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
    <div className={`${styles.card} ${viewMode === 'list' ? styles.listCard : ''}`}>
      {/* Post Header with User Info */}
      <div className={styles.postHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatarContainer}>
            {post.profilePicture && post.profilePicture !== '/profile-placeholder.jpg' ? (
              <Image
                src={post.profilePicture}
                alt={`${post.username}'s profile picture`}
                width={36}
                height={36}
                className={styles.profileImage}
              />
            ) : (
              <div
                className={styles.avatarPlaceholder}
                style={{ backgroundColor: generateColorFromUsername(post.username) }}
              >
                {post.username ? post.username.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>

          <div className={styles.nameDate}>
            <Link href={`/otheruserprofile/${post.username}`} className={styles.username}>
              {post.username}
            </Link>
            <span className={styles.postDate}>{timeAgo}</span>
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
                onClick={() => handleMenuAction('save')}
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
                onClick={() => handleMenuAction('hide')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <span>Hide</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => handleMenuAction('report')}
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

      <div className={viewMode === 'list' ? styles.listContent : ''}>
        {/* Post Title and Content */}
        <div className={styles.textContent}>
          <Link href={`/discussion?id=${post.id || post._id}`}>
            <h3 className={styles.postTitle}>{post.title}</h3>
          </Link>

          {post.content && (
            <p className={styles.postContent}>{post.content}</p>
          )}
        </div>

        {/* Post Image */}
        {post.image && post.image !== '/api/placeholder/600/300' && (
          <div className={`${styles.postImageContainer} ${viewMode === 'list' ? styles.listImageContainer : ''}`}>
            <div className={styles.postImageWrapper}>
              <Image
                src={post.image}
                alt={post.title}
                width={viewMode === 'list' ? 200 : 600}
                height={viewMode === 'list' ? 100 : 300}
                className={styles.postImage}
              />
            </div>
          </div>
        )}

      </div>

      <div className={styles.postEngagement}>
        <button
          className={styles.discussionsBtn}
          onClick={handleDiscussionClick}
          aria-label="View discussions"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>{post.discussions || 0} Discussions</span>
        </button>

        <button
          className={styles.shareBtn}
          onClick={handleShare}
          aria-label="Share post"
        >
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

      {/* Report Modal */}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        postData={{
          id: post.id || post._id,
          title: post.title || 'Untitled Discussion'
        }}
      />

      {/* Save Modal - NEW */}
      <PostSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        post={post}
        onSave={handleSaveToPlaylist}
      />
    </div>
  );
};

export default SubscriptionPostItem;