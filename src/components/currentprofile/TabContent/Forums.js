'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './Forums.module.css';
import ForumsTabDiscussions from './ForumsTabDiscussions';
import EditForumModal from './EditForumModal';

const ForumCard = ({ forum, onClick, onDelete, onEdit }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  // Menu option handlers

  const handleEdit = (e) => {
    e.stopPropagation();
    console.log(`Editing forum: ${forum.title}`);
    setIsMenuOpen(false);

    if (onEdit) {
      onEdit(forum);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    console.log(`Deleting forum: ${forum.title}`);
    setIsMenuOpen(false);

    // Call onDelete if provided
    if (onDelete) {
      onDelete(forum);
    }
  };

  return (
    <div className={styles.postCard} onClick={() => onClick(forum)}>
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
                onClick={handleEdit}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button
                className={`${styles.dropdownItem} ${styles.deleteDropdownItem}`}
                onClick={handleDelete}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
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
    </div>
  );
};

const Forums = ({ username }) => {
  const router = useRouter();
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForum, setSelectedForum] = useState(null);
  // State for modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [forumToDelete, setForumToDelete] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [forumToEdit, setForumToEdit] = useState(null);

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

  // Edit button click handler
  const handleEditClick = (forum) => {
    setForumToEdit(forum);
    setIsEditModalOpen(true);
  };

  // Save edited forum
  const handleSaveEdit = async (updatedForum) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/forums/${updatedForum.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: updatedForum.title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update forum');
      }

      const data = await response.json();

      // Update forums state
      setForums(prevForums =>
        prevForums.map(forum =>
          forum.id === updatedForum.id ? { ...forum, title: updatedForum.title } : forum
        )
      );

      // Close the modal
      setIsEditModalOpen(false);
      setForumToEdit(null);
    } catch (error) {
      console.error('Error updating forum:', error);
      setError('Failed to update forum. Please try again.');
    }
  };

  // Add handler for delete button click
  const handleDeleteClick = (forum) => {
    setForumToDelete(forum);
    setIsDeleteModalOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (forumId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/forums/${forumId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete forum');
      }

      // Remove forum from state
      setForums(prevForums =>
        prevForums.filter(f => f.id !== forumId)
      );

      // Close modal
      setIsDeleteModalOpen(false);
      setForumToDelete(null);
    } catch (error) {
      console.error('Error deleting forum:', error);
      setError('Failed to delete forum. Please try again.');
    }
  };

  // Return to forums view
  const handleBackToForums = () => {
    setSelectedForum(null);
  };

  // Handle forum updates safely
  const handleForumUpdate = (updatedForum) => {
    // Use functional state update to avoid race conditions
    setForums(prevForums =>
      prevForums.map(forum =>
        forum.id === updatedForum.id ? updatedForum : forum
      )
    );

    // Also update the selected forum if it's the same one
    if (selectedForum && selectedForum.id === updatedForum.id) {
      setSelectedForum(updatedForum);
    }
  };

  // Render forums or discussions based on selection
  if (selectedForum) {
    return (
      <ForumsTabDiscussions
        forum={selectedForum}
        onBack={handleBackToForums}
        onForumUpdate={handleForumUpdate}
      />
    );
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
            onDelete={handleDeleteClick}
            onEdit={handleEditClick}
          />
        ))
      ) : (
        <div className={styles.emptyState}>
          <p>No forums found.</p>
          <p>Forums this user creates or participates in will appear here.</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {isDeleteModalOpen && forumToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <h2>Delete Forum</h2>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setForumToDelete(null);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              <p className={styles.confirmationText}>
                Are you sure you want to delete <span className={styles.forumTitle}>"{forumToDelete.title}"</span>?
              </p>
              <p className={styles.warningText}>
                This action cannot be undone. All posts in this forum will be removed from the collection.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setForumToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteConfirm(forumToDelete.id)}
              >
                Delete Forum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Forum Modal */}
      <EditForumModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setForumToEdit(null);
        }}
        forum={forumToEdit}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Forums;