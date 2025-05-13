'use client';

import React, { useState, useEffect } from 'react';
import styles from './EditForumModal.module.css';

const EditForumModal = ({ isOpen, onClose, forum, onSave }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize title when forum data changes or modal opens
  useEffect(() => {
    if (isOpen && forum) {
      setTitle(forum.title || '');
      setError(null);
    }
  }, [isOpen, forum]);

  // Handle title input change
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!title.trim()) {
      setError('Please enter a forum title');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare updated forum data
      const updatedForum = {
        ...forum,
        title: title.trim()
      };
      
      // Call onSave callback with updated data
      if (onSave) {
        await onSave(updatedForum);
      }
      
      // Close the modal (handled by parent component after save)
    } catch (error) {
      console.error('Error updating forum:', error);
      setError(error.message || 'Failed to update forum');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Edit Forum</h2>
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
            <label htmlFor="forumTitle">Forum Title</label>
            <input
              type="text"
              id="forumTitle"
              value={title}
              onChange={handleTitleChange}
              className={styles.input}
              placeholder="Enter forum title"
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

export default EditForumModal;