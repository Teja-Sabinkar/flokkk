// src/components/explore/ExploreItem.js - Modified for Save, Report, Share and Hide functionality
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // Import Next.js router
import styles from './ExploreItem.module.css';
import PostSaveModal from '../home/PostSaveModal'; // Import PostSaveModal component
import ReportModal from '../report/ReportModal'; // Import ReportModal component
import ShareModal from '../share/ShareModal'; // Import ShareModal component
import { submitReport } from '../../components/report/reportService'; // Import report submission service with correct path

const ExploreItem = ({ username, timeAgo, title, description, imageUrl, discussionCount, profilePicture, id, onHide }) => {
  const router = useRouter(); // Initialize the Next.js router
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false); // State for save modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // State for report modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // State for share modal
  const [isReporting, setIsReporting] = useState(false); // State for report submission
  const [reportError, setReportError] = useState(null); // State for report errors
  const [isHiding, setIsHiding] = useState(false); // State for hide operation
  const [isHidden, setIsHidden] = useState(false); // State to track if item is hidden
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
    setIsMenuOpen(false); // Close dropdown menu first
    setIsSaveModalOpen(true); // Open save modal
  };

  const handleHide = async () => {
    try {
      setIsMenuOpen(false); // Close dropdown menu
      setIsHiding(true); // Set hiding state for loading indicator

      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call the API to hide the post
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

      // Set as hidden locally
      setIsHidden(true);

      // If parent component provided an onHide callback, call it
      if (typeof onHide === 'function') {
        onHide(id);
      }

      console.log(`Hidden: ${title} (ID: ${id})`);

      // You could show a toast notification here
    } catch (error) {
      console.error('Error hiding post:', error);
      // You could show an error toast notification here
    } finally {
      setIsHiding(false);
    }
  };

  const handleReport = () => {
    setIsMenuOpen(false); // Close dropdown menu first
    setIsReportModalOpen(true); // Open report modal
  };

  // Handler for modal close
  const handleReportModalClose = () => {
    setIsReportModalOpen(false);
    setReportError(null);
  };

  // Handler for report submission
  const handleReportSubmit = async (reportData) => {
    try {
      setIsReporting(true);
      setReportError(null);

      // Submit the report using the service
      await submitReport(reportData);

      // Close the modal after successful submission
      setIsReportModalOpen(false);

      // You could show a success toast notification here
      console.log(`Report submitted for post "${title}"`);
    } catch (error) {
      console.error('Error submitting report:', error);
      setReportError(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  // Handler for share button click
  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  // Handler for share modal close
  const handleShareModalClose = () => {
    setIsShareModalOpen(false);
  };

  // Handler for discussions button click
  const handleDiscussionsClick = () => {
    // Navigate to the discussion page using Next.js router
    router.push(`/discussion?id=${id}`);
  };

  // Handler for modal close
  const handleSaveModalClose = () => {
    setIsSaveModalOpen(false);
  };

  // Handler for successful save
  const handleSaveSuccess = (saveResult) => {
    console.log(`Saved post "${title}" to playlist: ${saveResult.playlistTitle}`);
    setIsSaveModalOpen(false);
    // You could show a success message/toast here if desired
  };

  // Generate a color based on username for avatar
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

  // Prepare post data for the save modal
  const postData = {
    id: id, // Make sure id is passed as a prop
    title: title,
    description: description,
    content: description, // Use description as content
    image: imageUrl,
    username: username
  };

  // Prepare content details for the report modal
  const contentDetails = {
    postId: id,
    userId: null, // We might not have this info, server will handle it
    username: username,
    title: title,
    content: description,
    image: imageUrl,
    hashtags: [], // We might not have this info
    reportedAt: new Date().toISOString()
  };

  // Prepare data for the share modal
  const sharePostData = {
    id: id,
    title: title,
    content: description,
    username: username
  };

  // Check if profilePicture is available and not the default placeholder
  const hasProfilePicture = profilePicture &&
    profilePicture !== '/profile-placeholder.jpg';

  // Check if item is hidden, if so return null (don't render)
  if (isHidden) {
    return null;
  }

  return (
    <div className={styles.item}>
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
                key={profilePicture} // Force re-render when URL changes
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

      {/* Rest of component remains unchanged */}
      <h3 className={styles.itemTitle}>{title}</h3>
      <p className={styles.itemDescription}>{description}</p>

      <div className={styles.imageContainer}>
        <div className={styles.imageWrapper}>
          <Image
            src={imageUrl || "/api/placeholder/600/300"}
            alt={title}
            width={600}
            height={300}
            className={styles.itemImage}
          />
        </div>
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

      {/* Add the PostSaveModal component */}
      <PostSaveModal
        isOpen={isSaveModalOpen}
        onClose={handleSaveModalClose}
        post={postData}
        onSave={handleSaveSuccess}
      />

      {/* Add the ReportModal component */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={handleReportModalClose}
        onSubmit={handleReportSubmit}
        contentDetails={contentDetails}
      />

      {/* Add the ShareModal component */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={handleShareModalClose}
        postData={sharePostData}
      />
    </div>
  );
};

export default ExploreItem;