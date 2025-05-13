'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './Forums.module.css';
import ForumsTabDiscussions from './ForumsTabDiscussions';
import { ReportModal, submitReport } from '@/components/report'; // Import ReportModal component

const ForumCard = ({ forum, onClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // Add state for report modal
  const [reportSuccess, setReportSuccess] = useState(false); // Add state for report success
  const [saveStatus, setSaveStatus] = useState({ loading: false, success: false, error: null }); // Add save status
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

  // Handle menu button click without triggering card click
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  // Function to save forum as a playlist
  const saveForumAsPlaylist = async (forum) => {
    try {
      setSaveStatus({ loading: true, success: false, error: null });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Make API request to save the forum as a playlist
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `${forum.title} (Saved)`,
          description: forum.description || '',
          originalForumId: forum.id,
          visibility: 'private'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save forum as playlist');
      }

      // Get the created playlist
      const newPlaylist = await response.json();

      // Now save the forum posts to the playlist
      const postsResponse = await fetch(`/api/forums/${forum.id}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!postsResponse.ok) {
        throw new Error('Failed to get forum posts');
      }

      const postsData = await postsResponse.json();

      // If there are posts, add them to the playlist
      if (postsData.posts && postsData.posts.length > 0) {
        // Add each post to the playlist
        for (const post of postsData.posts) {
          await fetch(`/api/playlists/${newPlaylist.id}/posts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ postId: post.id || post._id })
          });
        }
      }

      setSaveStatus({ loading: false, success: true, error: null });

      // Clear success status after 3 seconds
      setTimeout(() => {
        setSaveStatus({ loading: false, success: false, error: null });
      }, 3000);

    } catch (error) {
      console.error('Error saving forum as playlist:', error);
      setSaveStatus({ loading: false, success: false, error: error.message });

      // Clear error after 3 seconds
      setTimeout(() => {
        setSaveStatus({ loading: false, success: false, error: null });
      }, 3000);
    }
  };

  // Menu option handlers
  const handleSave = (e) => {
    e.stopPropagation();
    console.log(`Saving forum: ${forum.title}`);
    setIsMenuOpen(false);
    saveForumAsPlaylist(forum);
  };

  const handleReport = (e) => {
    e.stopPropagation();
    console.log(`Reported forum: ${forum.title}`);
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

  // Handle card click (only if not clicking on modal)
  const handleCardClick = (e) => {
    // Don't navigate if modal is open
    if (isReportModalOpen) {
      e.stopPropagation();
      return;
    }
    onClick(forum);
  };

  return (
    <div className={styles.postCard} onClick={handleCardClick}>
      {/* Success/Error messages */}

      {saveStatus.error && (
        <div className={styles.errorMessage}>
          Error: {saveStatus.error}
        </div>
      )}


      <div className={styles.postHeader}>
        <div className={styles.playlistTitle}>
          <h3>{forum.title}</h3>
        </div>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.postMenu}
            aria-label="Forum menu"
            onClick={handleMenuClick}
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
                disabled={saveStatus.loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>{saveStatus.loading ? 'Saving...' : 'Save'}</span>
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

      <div className={styles.postImageContainer}>
        <div className={styles.postImageWrapper}>
          <Image
            src={forum.imageSrc || '/api/placeholder/400/200'}
            alt={forum.title}
            width={600}
            height={300}
            className={styles.postImage}
            unoptimized
            priority
            key={`forum-image-${forum.id}-${forum.imageSrc}`} // Force re-render when image changes
          />
          <div className={styles.forumCount}>{forum.postCount} posts</div>
        </div>
      </div>

      <div className={styles.postEngagement}>
        <div className={styles.playlistUpdate}>
          Updated {forum.updatedAt || 'recently'}
        </div>
      </div>

      {/* Add the ReportModal component */}
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
              postId: forum.id,
              userId: forum.userId,
              username: forum.username,
              title: forum.title,
              content: forum.description || '',
              hashtags: [],
              image: forum.imageSrc
            }}
          />
        </div>
      )}
    </div>
  );
};

const Forums = ({ username }) => {
  const router = useRouter();
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForum, setSelectedForum] = useState(null);

  // Fetch forums from API
  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true);

        // Check for null/undefined username
        if (!username) {
          setError('No username provided');
          setLoading(false);
          return;
        }

        console.log(`Attempting to fetch forums for username: ${username}`);

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Get any URL parameters from the page
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('id');

        // Try to find the user by both name and username since there's inconsistency
        let apiUrl = `/api/forums?user=${encodeURIComponent(username)}`;
        if (urlUserId) {
          apiUrl += `&id=${urlUserId}`;
        }

        console.log('Fetching forums with URL:', apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // If response is not OK, try with the 'name' parameter as fallback
          const nameResponse = await fetch(`/api/forums?name=${encodeURIComponent(username)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (nameResponse.ok) {
            const data = await nameResponse.json();
            console.log('Forums fetched successfully using name parameter:', data);
            setForums(data.forums || []);
          } else {
            // All attempts failed
            console.error('All forum fetch attempts failed');
            setForums([]);
            setError('No forums found for this user');
          }
        } else {
          // Success with first attempt
          const data = await response.json();
          console.log('Forums fetched successfully:', data);
          setForums(data.forums || []);
        }
      } catch (err) {
        console.error('Error fetching forums:', err);
        setError(err.message || 'Failed to load forums');
      } finally {
        setLoading(false);
      }
    };

    fetchForums();
  }, [username]);

  // Handle forum card click
  const handleForumClick = (forum) => {
    // Set selected forum to display discussions view
    setSelectedForum(forum);
  };

  // Return to forums view
  const handleBackToForums = () => {
    setSelectedForum(null);
  };

  // Render forums or discussions based on selection
  if (selectedForum) {
    return <ForumsTabDiscussions forum={selectedForum} onBack={handleBackToForums} />;
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading forums...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.forumsTabContainer}>
      {forums.length > 0 ? (
        forums.map(forum => (
          <ForumCard
            key={forum.id}
            forum={forum}
            onClick={handleForumClick}
          />
        ))
      ) : (
        <div className={styles.emptyState}>
          <p>No forums found.</p>
          <p>Forums this user creates or participates in will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default Forums;