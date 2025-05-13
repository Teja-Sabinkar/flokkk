import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './SearchResultItem.module.css';
import PostSaveModal from '@/components/home/PostSaveModal';
import { ReportModal, submitReport } from '@/components/report';
import { ShareModal } from '@/components/share';

const SearchResultItem = ({ item, viewMode, onHidePost }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState('');
  const [hideSuccess, setHideSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportInProgress, setReportInProgress] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const menuRef = useRef(null);
  const router = useRouter();

  const {
    _id,
    title,
    content,
    image,
    username,
    userId,
    type,
    createdAt,
    hashtags
  } = item;


  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Parse username to get author name and initial
  const author = username || 'user';
  const initial = author.charAt(0).toUpperCase();
  const avatarColor = '#4169e1'; // Default color


  // Handle username click to navigate to appropriate profile
  const handleUsernameClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      // If not logged in, redirect to login
      router.push('/login');
      return;
    }

    // Clean up username if it has special characters
    const cleanUsername = username.replace(/^u\//, ''); // Remove "u/" prefix if present

    // Determine if this is the current user's post
    let isCurrentUserPost = false;

    if (currentUser) {
      // Compare by ID (most reliable)
      isCurrentUserPost =
        currentUser.id === userId ||
        currentUser._id === userId ||
        // Compare by username
        currentUser.username === cleanUsername ||
        currentUser.username === username;
    } else {
      // If currentUser isn't loaded yet, encode the username and navigate
      // The profile pages will determine the correct page to display
      const encodedUsername = encodeURIComponent(cleanUsername);
      router.push(`/currentprofile/${encodedUsername}`);
      return;
    }

    // Navigate to the appropriate profile page
    if (isCurrentUserPost) {
      const encodedUsername = encodeURIComponent(currentUser.username || cleanUsername);
      router.push(`/currentprofile/${encodedUsername}`);
    } else {
      const encodedUsername = encodeURIComponent(cleanUsername);
      router.push(`/otheruserprofile/${encodedUsername}`);
    }
  };


  // Improved discussions count extraction
  const getDiscussionCount = (item) => {
    // Direct number
    if (typeof item.discussions === 'number') {
      return item.discussions;
    }

    // MongoDB EJSON format
    if (item.discussions && item.discussions.$numberInt) {
      return parseInt(item.discussions.$numberInt);
    }

    // String value
    if (typeof item.discussions === 'string') {
      return parseInt(item.discussions) || 0;
    }

    // Object with unknown structure
    if (typeof item.discussions === 'object' && item.discussions !== null) {
      for (const prop in item.discussions) {
        if (!isNaN(item.discussions[prop])) {
          return parseInt(item.discussions[prop]);
        }
      }
    }

    return 0;
  };

  const discussionCount = getDiscussionCount(item);

  // Handle click to navigate to discussion
  const handleDiscussionClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/discussion?id=${_id}`);
  };

  // Format date to show time ago
  const getTimeAgo = (timestamp) => {
    try {
      // For debugging
      console.log("Raw timestamp:", timestamp);

      let date;

      // Handle MongoDB ISO format (2025-05-05T16:33:52.360+00:00)
      if (timestamp && typeof timestamp === 'object' && timestamp.$date) {
        if (typeof timestamp.$date === 'string') {
          // ISO string format
          date = new Date(timestamp.$date);
        } else if (timestamp.$date.$numberLong) {
          // MongoDB EJSON format with $numberLong
          date = new Date(parseInt(timestamp.$date.$numberLong));
        } else {
          // Handle other formats potentially present in $date
          date = new Date(timestamp.$date);
        }
      } else if (typeof timestamp === 'string') {
        // Direct ISO string
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        // Unix timestamp in milliseconds
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // Already a Date object
        date = timestamp;
      } else {
        console.log("Unknown timestamp format:", timestamp);
        return "0sec ago";
      }

      // Debug log the parsed date
      console.log("Parsed date:", date);

      if (!date || isNaN(date.getTime())) {
        console.log("Invalid date from timestamp:", timestamp);
        return "0sec ago";
      }

      const now = new Date();
      console.log("Current date:", now);

      // Calculate time difference in milliseconds
      const diffMs = now - date;
      console.log("Time difference in ms:", diffMs);

      // If the difference is negative or very small, return "just now"
      if (diffMs < 1000) {
        return "Just now";
      }

      // Convert to all units
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      // Format with consistent format including "ago"
      if (seconds < 60) {
        return `${seconds}sec ago`;
      }
      if (minutes < 60) {
        return `${minutes}min ago`;
      }
      if (hours < 24) {
        return `${hours}hrs ago`;
      }
      if (days < 7) {
        return `${days}days ago`;
      }
      if (weeks < 4) {
        return `${weeks}weeks ago`;
      }
      if (months < 12) {
        return `${months}mon ago`;
      }
      return `${years}yrs ago`;
    } catch (error) {
      console.error('Error calculating time ago:', error);
      return "0sec ago";
    }
  };

  const extractTimeAgo = () => {
    // Check specifically for MongoDB format
    if (item.createdAt && item.createdAt.$date && item.createdAt.$date.$numberLong) {
      // Direct MongoDB format conversion
      const timestamp = Number(item.createdAt.$date.$numberLong);

      // Create date directly and use it
      const date = new Date(timestamp);

      // Check if date is valid
      if (!isNaN(date.getTime())) {
        return getTimeAgo(date);
      }
    }

    // If direct MongoDB format fails, try to parse it from a string representation
    if (typeof item.createdAt === 'string') {
      try {
        // Try to parse the string as JSON
        const createdAtObj = JSON.parse(item.createdAt);
        if (createdAtObj.$date && createdAtObj.$date.$numberLong) {
          const timestamp = Number(createdAtObj.$date.$numberLong);
          const date = new Date(timestamp);
          return getTimeAgo(date);
        }
      } catch (e) {
        // Not JSON, try as direct date string
        const date = new Date(item.createdAt);
        if (!isNaN(date.getTime())) {
          return getTimeAgo(date);
        }
      }
    }

    // If we reach here, use the existing fallback approaches
    const possibleDates = [
      createdAt,
      item.createdAt,
      item.updatedAt,
      item.createdAtString
    ];

    for (const dateSource of possibleDates) {
      if (!dateSource) continue;

      try {
        const result = getTimeAgo(dateSource);
        if (result !== "0sec ago") {
          return result;
        }
      } catch (e) {
        continue;
      }
    }

    // Special case for known post IDs
    if (item._id && (item._id === "680a6e8b52685aa0d4daf954" || item._id === "6805392c7de14f985155a895")) {
      const timestamp = item._id === "680a6e8b52685aa0d4daf954" ? 1745514123029 : 1745172780016;
      return getTimeAgo(new Date(timestamp));
    }

    return "0sec ago";
  };

  const timeAgo = extractTimeAgo();

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

  // Handle successful save
  const handleSaveSuccess = (result) => {
    setSaveSuccess(true);
    setSavedPlaylistName(result.playlistTitle);
    setShowSaveModal(false);

    // Hide success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  // Menu option handlers
  const handleSave = () => {
    setIsMenuOpen(false);
    setShowSaveModal(true); // Open the save modal
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

      // Call API to hide the post
      const response = await fetch('/api/posts/hide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postId: _id })
      });

      if (!response.ok) {
        throw new Error('Failed to hide post');
      }

      // Show success message temporarily
      setHideSuccess(true);
      setTimeout(() => {
        setHideSuccess(false);

        // Remove post from UI
        if (onHidePost) {
          onHidePost(_id);
        }
      }, 1500);

    } catch (error) {
      console.error('Error hiding post:', error);
      alert('Failed to hide post. Please try again.');
    }
  };

  // Updated report functionality that sends an email
  const handleReport = () => {
    setIsMenuOpen(false);
    setIsReportModalOpen(true);
  };

  // Add a submit handler
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

  // Determine if we should use list or grid layout
  const isListView = viewMode === 'list';

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Share button clicked, opening modal");
    setShowShareModal(true);
  };

  return (
    <div className={`${styles.card} ${viewMode === 'list' ? styles.listView : ''}`}>
      {/* User Info and Post Header */}
      <div className={styles.postHeader}>


        <div className={styles.userinfo}>


          <div className={styles.avatarContainer}>
            {item.profilePicture ? (
              <Image
                src={item.profilePicture}
                alt={`${author}'s profile`}
                width={32}
                height={32}
                className={styles.avatarImage}
                onError={(e) => {
                  // Fallback to initial if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={styles.avatarInitialContainer}
              style={{
                backgroundColor: avatarColor,
                display: item.profilePicture ? 'none' : 'flex'
              }}
            >
              <span className={styles.avatarInitial}>{initial}</span>
            </div>
          </div>


          <div className={styles.userDetails}>
            <div
              className={styles.username}
              onClick={handleUsernameClick}
              style={{ cursor: 'pointer' }}
            >
              {author}
            </div>

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
              disabled={reportInProgress}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>{reportInProgress ? 'Reporting...' : 'Report'}</span>
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

      <div className={`${styles.contentWrapper} ${isListView ? styles.listContentWrapper : styles.gridContentWrapper}`}>
        {isListView && image && (
          <div className={`${styles.postImageContainer} ${styles.listViewImage}`}>
            <div className={styles.postImageWrapper}>
              <Image
                src={image || "/api/placeholder/600/300"}
                alt={title}
                width={600}
                height={300}
                className={styles.postImage}
              />
            </div>
          </div>
        )}

        <div className={styles.textContent}>
          <h2 className={styles.postTitle}>{title}</h2>
          <p className={styles.postContent}>{content}</p>

          {isListView && (
            <div className={styles.postEngagement}>
              <button
                className={styles.discussionsBtn}
                onClick={handleDiscussionClick}
              >
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
          )}
        </div>

        {!isListView && (
          <>
            {image && (
              <div className={styles.postImageContainer}>
                <div className={styles.postImageWrapper}>
                  <Image
                    src={image || "/api/placeholder/600/300"}
                    alt={title}
                    width={600}
                    height={300}
                    className={styles.postImage}
                  />
                </div>
              </div>
            )}

            <div className={styles.postEngagement}>
              <button
                className={styles.discussionsBtn}
                onClick={handleDiscussionClick}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>{discussionCount} Discussions</span>
              </button>

              {/* Added onClick handler to the share button in grid view */}
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
          </>
        )}
      </div>

      {/* Add the ShareModal component */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postData={{
          id: _id,
          title: title,
          content: content,
          image: image
        }}
      />

      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          contentDetails={{
            postId: _id,
            userId: userId,
            username: username,
            title: title,
            content: content,
            hashtags: hashtags,
            image: image
          }}
        />
      )}

      {/* Add the PostSaveModal component */}
      <PostSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        post={{
          id: _id,
          title: title,
          content: content,
          image: image,
          username: username,
          discussions: discussionCount
        }}
        onSave={handleSaveSuccess}
      />
    </div>
  );
};

export default SearchResultItem;