import React, { useState, useEffect, useRef } from 'react';
import styles from './EditProfileModal.module.css';

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

const EditProfileModal = ({ isOpen, onClose, profileData, onSave }) => {
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    website: '',
    socialLinks: []
  });
  
  // Add states for profile picture and banner
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileBanner, setProfileBanner] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [profileBannerPreview, setProfileBannerPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs for file inputs
  const profilePictureInputRef = useRef(null);
  const profileBannerInputRef = useRef(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (profileData && isOpen) {
      setFormData({
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
        socialLinks: Array.isArray(profileData.socialLinks) 
          ? [...profileData.socialLinks] 
          : []
      });
      
      // Reset image previews when modal opens
      setProfilePicturePreview(profileData.profilePicture || '/profile-placeholder.jpg');
      setProfileBannerPreview(profileData.profileBanner || '');
      setProfilePicture(null);
      setProfileBanner(null);
      setErrorMessage('');
    }
  }, [profileData, isOpen]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle social link changes
  const handleSocialLinkChange = (index, field, value) => {
    const updatedLinks = [...formData.socialLinks];
    updatedLinks[index] = {
      ...updatedLinks[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      socialLinks: updatedLinks
    }));
  };

  // Add new social link
  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: '', url: '' }]
    }));
  };

  // Remove social link
  const removeSocialLink = (index) => {
    const updatedLinks = [...formData.socialLinks];
    updatedLinks.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      socialLinks: updatedLinks
    }));
  };
  
  // Validate URL format
  const isValidUrl = (url) => {
    if (!url) return true; // Empty URLs are allowed
    
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Handle profile picture change
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      
      if (!validImageTypes.includes(file.type)) {
        setErrorMessage('Profile picture must be a JPG, PNG, GIF, or WebP image');
        return;
      }
      
      if (file.size > maxFileSize) {
        setErrorMessage('Profile picture must be less than 5MB');
        return;
      }
      
      try {
        // Compress the image before setting it
        const compressedFile = await compressImage(file, 800, 800, 0.8);
        
        setProfilePicture(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setProfilePicturePreview(previewUrl);
        setErrorMessage('');
      } catch (error) {
        console.error('Error compressing image:', error);
        setErrorMessage('Error processing image. Please try another.');
      }
    }
  };
  
  // Handle profile banner change
  const handleProfileBannerChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      
      if (!validImageTypes.includes(file.type)) {
        setErrorMessage('Profile banner must be a JPG, PNG, GIF, or WebP image');
        return;
      }
      
      if (file.size > maxFileSize) {
        setErrorMessage('Profile banner must be less than 10MB');
        return;
      }
      
      try {
        // Compress the banner image - using larger dimensions for banner
        const compressedFile = await compressImage(file, 1200, 400, 0.8);
        
        setProfileBanner(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setProfileBannerPreview(previewUrl);
        setErrorMessage('');
      } catch (error) {
        console.error('Error compressing image:', error);
        setErrorMessage('Error processing image. Please try another.');
      }
    }
  };
  
  // Trigger file input click
  const triggerProfilePictureInput = () => {
    profilePictureInputRef.current.click();
  };
  
  const triggerProfileBannerInput = () => {
    profileBannerInputRef.current.click();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Validate website URL if provided
    if (formData.website && !isValidUrl(formData.website)) {
      setErrorMessage('Please enter a valid website URL (e.g., https://example.com)');
      return;
    }
    
    // Validate social link URLs
    for (const link of formData.socialLinks) {
      if (link.platform && link.url && !isValidUrl(link.url)) {
        setErrorMessage(`Please enter a valid URL for ${link.platform}`);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Combine all form data including image files
      const updatedProfileData = {
        ...formData,
        profilePicture: profilePicture,
        profileBanner: profileBanner,
        // Include the preview URLs for immediate UI update
        profilePicturePreview: profilePicturePreview,
        profileBannerPreview: profileBannerPreview
      };
      
      const result = await onSave(updatedProfileData);
      
      if (result && result.success) {
        onClose();
      } else if (result && result.error) {
        setErrorMessage(result.error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error submitting profile update:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Edit Profile</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={isSubmitting}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* Profile Banner Section */}
          <div className={styles.formGroup}>
            <label>Profile Banner</label>
            <div 
              className={styles.bannerUploadContainer}
              onClick={triggerProfileBannerInput}
              style={{ 
                backgroundImage: profileBannerPreview ? `url(${profileBannerPreview})` : 'none',
                backgroundColor: profileBannerPreview ? 'transparent' : '#333'
              }}
            >
              <input 
                type="file" 
                ref={profileBannerInputRef}
                onChange={handleProfileBannerChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                disabled={isSubmitting}
              />
              <div className={styles.uploadOverlay}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{profileBannerPreview ? 'Change Banner' : 'Upload Banner'}</span>
              </div>
            </div>
          </div>
          
          {/* Profile Picture Section */}
          <div className={styles.formGroup}>
            <label>Profile Picture</label>
            <div className={styles.pictureUploadContainer}>
              <div 
                className={styles.profilePicturePreview}
                onClick={triggerProfilePictureInput}
                style={{ backgroundImage: `url(${profilePicturePreview})` }}
              >
                <input 
                  type="file" 
                  ref={profilePictureInputRef}
                  onChange={handleProfilePictureChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  disabled={isSubmitting}
                />
                <div className={styles.pictureUploadOverlay}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              placeholder="Tell us about yourself"
              className={styles.textArea}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className={styles.charCount}>
              {formData.bio.length}/500
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. San Francisco, CA"
              className={styles.input}
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="e.g. https://example.com"
              className={styles.input}
              maxLength={200}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.sectionHeader}>
              <label>Social Links</label>
              <button 
                type="button" 
                onClick={addSocialLink} 
                className={styles.addButton}
                disabled={isSubmitting || formData.socialLinks.length >= 5}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add Link
              </button>
            </div>

            {formData.socialLinks.map((link, index) => (
              <div key={index} className={styles.socialLinkItem}>
                <div className={styles.socialLinkInputs}>
                  <select
                    value={link.platform}
                    onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                    className={styles.selectInput}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Platform</option>
                    <option value="Twitter">Twitter</option>
                    <option value="GitHub">GitHub</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    placeholder="Profile URL"
                    className={styles.input}
                    disabled={isSubmitting}
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={() => removeSocialLink(index)}
                  className={styles.removeButton}
                  disabled={isSubmitting}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;