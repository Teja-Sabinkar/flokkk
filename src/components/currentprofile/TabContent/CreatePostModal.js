import React, { useState, useRef } from 'react';
import styles from './CreatePostModal.module.css';

const CreatePostModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file input changes
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Update form data with the file
    setFormData(prev => ({
      ...prev,
      image: file
    }));

    // Create a preview URL for the image
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Remove the selected image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Handle image upload - this is where we need to ensure uniqueness
      // by adding a timestamp to the formData if there's an image
      const submissionData = {...formData};
      
      if (submissionData.image) {
        // Add a timestamp to the file name to prevent caching issues
        const originalFile = submissionData.image;
        const timestamp = Date.now();
        
        // Create a new file with timestamp in the name
        // This is a workaround for Vercel's caching behavior
        const fileExtension = originalFile.name.split('.').pop();
        const newFileName = `${originalFile.name.split('.')[0]}_${timestamp}.${fileExtension}`;
        
        // Create a new File object with the timestamped name
        const newFile = new File([originalFile], newFileName, {
          type: originalFile.type,
          lastModified: originalFile.lastModified
        });
        
        submissionData.image = newFile;
        submissionData.imageTimestamp = timestamp; // Add timestamp for reference
      }
      
      // Call the onSave function provided by the parent component
      const saveResult = await onSave(submissionData);
      
      if (saveResult) {
        // Reset form and close modal on successful save
        setFormData({
          title: '',
          description: '',
          image: null
        });
        setImagePreview(null);
        onClose();
      }
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Create Post</h2>
          <button className={styles.closeButton} onClick={onClose} type="button" disabled={isSubmitting}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter a title for your post (max 200 characters)."
              className={styles.input}
              required
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Write something about your post..."
              className={styles.textArea}
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Attachment</label>
            
            {!imagePreview ? (
              <div className={styles.uploadArea}>
                <div className={styles.uploadContent}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.uploadIcon}>
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className={styles.uploadText}>Drag and drop an image or</p>
                  <button 
                    type="button" 
                    className={styles.browseButton}
                    onClick={handleBrowseClick}
                    disabled={isSubmitting}
                  >
                    Browse Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.imagePreviewContainer}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className={styles.imagePreview} 
                />
                <button 
                  type="button" 
                  className={styles.removeImageButton}
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;