import React, { useState, useRef } from 'react';
import styles from './FeedbackSettings.module.css';

const FeedbackSettings = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    allowEmail: false
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null); // Add a ref for the file input

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Add this function to trigger the file input click
  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create FormData to send both text fields and the file
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('allowEmail', formData.allowEmail);
      
      if (selectedFile) {
        formDataToSend.append('file', selectedFile);
      }
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('You must be logged in to submit feedback');
      }
      
      // Send the form data to the API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }
      
      // Reset form after successful submission
      setFormData({
        title: '',
        description: '',
        allowEmail: false
      });
      setSelectedFile(null);
      
      // Show success message
      alert('Feedback submitted successfully!');
      
    } catch (error) {
      // Show error message
      alert('Error submitting feedback: ' + error.message);
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter a title for your feedback"
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={styles.textarea}
            placeholder="Please describe your feedback or issue in detail"
            rows={6}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.fileInputLabel}>
            <span>Attach files</span>
            <div className={styles.fileInputWrapper}>
              <input
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
                ref={fileInputRef} // Add the ref here
              />
              <button 
                type="button" 
                className={styles.fileButton}
                onClick={handleFileButtonClick} // Add onClick handler here
              >
                <span className="material-icons">file_upload</span>
                Choose files
              </button>
              {selectedFile && (
                <span className={styles.fileName}>{selectedFile.name}</span>
              )}
            </div>
          </label>
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              name="allowEmail"
              checked={formData.allowEmail}
              onChange={handleInputChange}
              className={styles.checkbox}
            />
            <span className={styles.checkmark}></span>
            <span className={styles.checkboxLabel}>We may email you for more information or updates</span>
          </label>
        </div>
        
        <div className={styles.disclaimer}>
          <p>Some account and system information may be sent to Google. We will use it to fix problems and improve our services, subject to our Privacy Policy and Terms of Service. We may email you for more information or updates. Go to Legal Help to ask for content changes for legal reasons.</p>
        </div>
        
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackSettings;