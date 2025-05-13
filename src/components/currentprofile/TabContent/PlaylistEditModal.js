'use client';

import React, { useState, useEffect } from 'react';
import styles from './PlaylistEditModal.module.css';

const PlaylistEditModal = ({ isOpen, onClose, playlist, onSave }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize title when playlist data changes or modal opens
  useEffect(() => {
    if (isOpen && playlist) {
      setTitle(playlist.title || '');
      setError(null);
    }
  }, [isOpen, playlist]);

  // Handle title input change
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      setError('Please enter a playlist title');
      return;
    }

    try {
      setLoading(true);
      
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call API to update playlist title
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update playlist');
      }

      const updatedPlaylist = await response.json();
      
      // Call onSave callback with updated data
      if (onSave) {
        onSave(updatedPlaylist);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error updating playlist:', error);
      setError(error.message || 'Failed to update playlist');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Edit Playlist</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            disabled={loading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="playlistTitle">Playlist Title</label>
            <input
              type="text"
              id="playlistTitle"
              value={title}
              onChange={handleTitleChange}
              className={styles.input}
              placeholder="Enter playlist title"
              maxLength={100}
              disabled={loading}
              autoFocus
            />
            <div className={styles.charCount}>
              {title.length}/100
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaylistEditModal;