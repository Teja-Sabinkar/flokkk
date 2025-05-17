// ContributeLinkModal.js
'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ContributeLinkModal.module.css'; // Update to use dedicated CSS

export default function ContributeLinkModal({ postId, postCreatorId, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const modalRef = useRef(null);
  const titleInputRef = useRef(null);
  
  // Focus the title input when the modal opens
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);
  
  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);
  
  // Handle escape key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(url)) {
      newErrors.url = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setSubmitting(true);
      
      // Format URL if needed
      let formattedUrl = url;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error("You must be logged in to submit links");
        }
        
        const response = await fetch('/api/link-contributions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            postId,
            creatorId: postCreatorId,
            title,
            url: formattedUrl,
            description
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to submit contribution");
        }
        
        const result = await response.json();
        onSubmit(result);
        onClose();
      } catch (error) {
        setErrors({ general: error.message });
        console.error('Error submitting contribution:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <button className={styles.closeButton} onClick={onClose} disabled={submitting}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 className={styles.modalTitle}>Contribute Community Link</h2>
        
        {errors.general && (
          <div className={styles.errorMessage}>{errors.general}</div>
        )}
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>Title *</label>
            <input
              id="title"
              type="text"
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter link title"
              ref={titleInputRef}
              disabled={submitting}
            />
            {errors.title && <p className={styles.errorText}>{errors.title}</p>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="url" className={styles.label}>URL *</label>
            <input
              id="url"
              type="text"
              className={`${styles.input} ${errors.url ? styles.inputError : ''}`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={submitting}
            />
            {errors.url && <p className={styles.errorText}>{errors.url}</p>}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>Description</label>
            <textarea
              id="description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief description of this link"
              rows={3}
              disabled={submitting}
            />
          </div>
          
          <div className={styles.buttonGroup}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}