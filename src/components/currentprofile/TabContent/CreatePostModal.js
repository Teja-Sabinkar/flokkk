import React, { useState, useRef } from 'react';
import styles from './CreatePostModal.module.css';

// Image compression function
const compressImage = (file, maxWidth = 1200, maxHeight = 800, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        }, 'image/jpeg', quality);
      };
    };
  });
};

const CreatePostModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Compress the image before setting it
      const compressedFile = await compressImage(file, 1200, 800, 0.8);
      
      // Update form data with the compressed file
      setFormData(prev => ({
        ...prev,
        image: compressedFile
      }));

      // Create a preview URL for the compressed image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Error processing image. Please try another.');
    } finally {
      setIsProcessing(false);
    }
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
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    onSave(formData);
    
    // Reset form and close modal
    setFormData({
      title: '',
      description: '',
      image: null
    });
    setImagePreview(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Create Post</h2>
          <button className={styles.closeButton} onClick={onClose}>
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
              placeholder="Enter a title for your post (max 200characters)."
              className={styles.input}
              required
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
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Browse Files'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                    disabled={isProcessing}
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
                  disabled={isProcessing}
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
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;