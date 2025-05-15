'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import styles from './CreateDiscussionModal.module.css';

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

export default function CreateDiscussionModal({ isOpen, onClose, onSubmit }) {
  // Form state
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [standardizedVideoUrl, setStandardizedVideoUrl] = useState('');
  const [error, setError] = useState(null);

  // Creator Links state
  const [creatorLinks, setCreatorLinks] = useState([]);
  const [currentLinkTitle, setCurrentLinkTitle] = useState('');
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [currentLinkDescription, setCurrentLinkDescription] = useState('');
  const [linkError, setLinkError] = useState(null);

  // Refs
  const fileInputRef = useRef(null);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Function to ensure URLs have http:// or https:// prefix
  const ensureUrlProtocol = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Handle fetch video info - Updated to use YouTube API
  const handleFetchInfo = async () => {
    if (!videoUrl) return;

    try {
      setIsLoading(true);
      setError(null);

      // Extract YouTube video ID
      let videoId = null;

      // Try to extract YouTube video ID from different URL formats
      if (videoUrl.includes('youtube.com/watch')) {
        try {
          const url = new URL(videoUrl);
          videoId = url.searchParams.get('v');
        } catch (e) {
          setError('Invalid YouTube URL. Please provide a valid YouTube video link.');
          setIsLoading(false);
          return;
        }
      } else if (videoUrl.includes('youtu.be/')) {
        const parts = videoUrl.split('/');
        videoId = parts[parts.length - 1].split('?')[0]; // Remove any query parameters
      } else if (videoUrl.includes('youtube.com/embed/')) {
        const parts = videoUrl.split('/embed/');
        videoId = parts[parts.length - 1].split('?')[0]; // Remove any query parameters
      }

      if (!videoId) {
        setError('Invalid YouTube URL. Please provide a valid YouTube video link.');
        setIsLoading(false);
        return;
      }

      // Create a standardized YouTube URL from the video ID
      const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
      setStandardizedVideoUrl(standardUrl);
      console.log('Set standardized video URL:', standardUrl);

      console.log(`Fetching data for video ID: ${videoId}`);

      // Call our new API endpoint to fetch video data
      // Using clone() technique to allow reading the response multiple times
      const response = await fetch(`/api/youtube?videoId=${videoId}`);

      // First, clone the response for use in error handling
      const responseClone = response.clone();

      let errorMessage = 'Failed to fetch video information';

      if (!response.ok) {
        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, use status text
          errorMessage = `Failed to fetch video information (${response.status}: ${response.statusText})`;
        }

        throw new Error(errorMessage);
      }

      const videoData = await response.json();
      console.log('Successfully fetched video data:', videoData);

      // Update state with fetched data
      setTitle(videoData.title || '');
      setDescription(videoData.description || '');

      // Use the highest quality thumbnail available
      const thumbnailUrl = videoData.thumbnails?.maxres ||
        videoData.thumbnails?.standard ||
        videoData.thumbnails?.high ||
        videoData.thumbnails?.medium ||
        videoData.thumbnails?.default;

      if (thumbnailUrl) {
        setThumbnailPreview(thumbnailUrl);
        console.log(`Set thumbnail preview: ${thumbnailUrl}`);
      } else {
        console.warn('No thumbnail URL found in response');
      }

      // Add channel to hashtags if not already included
      if (videoData.channelTitle && !hashtags.includes(`#${videoData.channelTitle.replace(/\s+/g, '')}`)) {
        const channelHashtag = `#${videoData.channelTitle.replace(/\s+/g, '')}`;
        setHashtags([...hashtags, channelHashtag]);
        console.log(`Added channel hashtag: ${channelHashtag}`);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching video info:', error);
      setError(error.message || 'Failed to fetch video information. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle thumbnail file selection
  const handleThumbnailChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError(null);
    setIsProcessingImage(true);

    // Create a simple preview immediately for better UX
    const immediatePreview = URL.createObjectURL(file);
    setThumbnailPreview(immediatePreview);

    try {
      // Skip compression for small images
      if (file.size < 1024 * 1024) {
        console.log("File is small enough, skipping compression");
        setThumbnailFile(file);
        setIsProcessingImage(false);
        return;
      }

      // For larger files, attempt compression with timeout
      const compressionPromise = compressImage(file, 1280, 720, 0.85);

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Compression timed out")), 5000);
      });

      // Race the compression against the timeout
      const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);

      console.log(`Original file: ${file.size} bytes, Compressed: ${compressedFile.size} bytes`);
      setThumbnailFile(compressedFile);

      // Update preview if compression succeeded
      const compressedPreview = URL.createObjectURL(compressedFile);
      setThumbnailPreview(compressedPreview);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fall back to using the original file
      setThumbnailFile(file);
      // We already set the preview, so no need to do it again
    } finally {
      setIsProcessingImage(false);
    }
  };


  // Handle choosing a file
  const handleChooseFile = () => {
    fileInputRef.current.click();
  };

  // Handle hashtag input
  const handleHashtagKeyDown = (e) => {
    // Add hashtag when pressing Enter or Space
    if ((e.key === 'Enter' || e.key === ' ') && currentHashtag.trim()) {
      e.preventDefault();
      const newHashtag = currentHashtag.trim().startsWith('#')
        ? currentHashtag.trim()
        : `#${currentHashtag.trim()}`;

      if (!hashtags.includes(newHashtag)) {
        setHashtags([...hashtags, newHashtag]);
      }
      setCurrentHashtag('');
    }
  };

  // Remove hashtag
  const removeHashtag = (tagToRemove) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  // Add creator link
  const addCreatorLink = () => {
    // Basic validation
    setLinkError(null);

    if (!currentLinkTitle.trim()) {
      setLinkError('Link title is required');
      return;
    }

    if (!currentLinkUrl.trim()) {
      setLinkError('Link URL is required');
      return;
    }

    // Ensure the URL has a protocol
    const formattedUrl = ensureUrlProtocol(currentLinkUrl.trim());

    // Simple URL validation
    try {
      new URL(formattedUrl); // Will throw if invalid
    } catch (e) {
      setLinkError('Please enter a valid URL');
      return;
    }

    // Add new link with properly formatted URL
    const newLink = {
      id: Date.now(), // Simple unique ID for UI purposes
      title: currentLinkTitle.trim(),
      url: formattedUrl,
      description: currentLinkDescription.trim()
    };

    setCreatorLinks([...creatorLinks, newLink]);

    // Clear inputs
    setCurrentLinkTitle('');
    setCurrentLinkUrl('');
    setCurrentLinkDescription('');
  };

  // Remove creator link
  const removeCreatorLink = (linkId) => {
    setCreatorLinks(creatorLinks.filter(link => link.id !== linkId));
  };

  // Reset form fields
  const resetForm = () => {
    setVideoUrl('');
    setTitle('');
    setDescription('');
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setHashtags([]);
    setCurrentHashtag('');
    setCreatorLinks([]);
    setCurrentLinkTitle('');
    setCurrentLinkUrl('');
    setCurrentLinkDescription('');
    setError(null);
    setLinkError(null);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // NEW VALIDATION: Check if thumbnail exists (either file or preview)
    if (!thumbnailFile && !thumbnailPreview) {
      setError('An image or thumbnail is required to create a discussion');
      return;
    }

    // Create form data
    const discussionData = {
      videoUrl: videoUrl.trim() || null,
      title: title.trim(),
      description: description.trim(),
      thumbnailFile,
      thumbnailPreview,
      hashtags,
      creatorLinks  // Add creator links to the submission data
    };

    console.log('Submitting discussion with creator links:', discussionData.creatorLinks);

    // Call the onSubmit function passed from the parent component
    if (onSubmit) {
      onSubmit(discussionData);
    }

    // Reset form
    resetForm();
  };

  // Check if form is valid for submit button state
  const isFormValid = title.trim() && (thumbnailFile || thumbnailPreview);
  const isProcessing = isLoading || isProcessingImage;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create New Discussion</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={isProcessing}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Youtube Link (Optional)</label>
            <div className={styles.videoLinkContainer}>
              <input
                type="text"
                placeholder="Paste YouTube URL here"
                className={styles.videoInput}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={isProcessing}
              />
              <button
                type="button"
                className={styles.fetchButton}
                onClick={handleFetchInfo}
                disabled={isProcessing || !videoUrl}
              >
                {isLoading ? 'Loading...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div className={styles.divider}>or</div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title</label>
            <input
              type="text"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isProcessing}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              disabled={isProcessing}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Thumbnail <span className={styles.requiredField}>*</span>
              <span className={styles.requiredFieldText}>(Required)</span>
            </label>
            <button
              type="button"
              className={styles.fileButton}
              onClick={handleChooseFile}
              disabled={isProcessing}
            >
              {isProcessingImage ? 'Processing...' : 'Choose File'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className={styles.fileInput}
              accept="image/*"
              onChange={handleThumbnailChange}
              disabled={isProcessing}
            />

            <div className={styles.thumbnailPreview}>
              {thumbnailPreview ? (
                <>
                  {isProcessingImage && (
                    <div className={styles.processingOverlay}>
                      <span>Processing image...</span>
                    </div>
                  )}
                  <Image
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    width={600}
                    height={300}
                    className={styles.previewImage}
                  />
                </>
              ) : (
                <div className={styles.noImageSelected}>
                  No image selected (Required)
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Hashtags</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Type and press Enter to add hashtags"
              value={currentHashtag}
              onChange={(e) => setCurrentHashtag(e.target.value)}
              onKeyDown={handleHashtagKeyDown}
              disabled={isProcessing}
            />

            {hashtags.length > 0 && (
              <div className={styles.hashtagsContainer}>
                {hashtags.map((tag, index) => (
                  <span key={index} className={styles.hashtag}>
                    {tag}
                    <button
                      type="button"
                      className={styles.removeHashtag}
                      onClick={() => removeHashtag(tag)}
                      disabled={isProcessing}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Creator Links Section - NEW */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Creator Links</label>
            <div className={styles.creatorLinksHelp}>
              Add useful links related to this post. These will only be shown on the discussion page.
            </div>

            {linkError && (
              <div className={styles.linkErrorMessage}>
                {linkError}
              </div>
            )}

            <div className={styles.linkInputsContainer}>
              <div className={styles.linkInputGroup}>
                <input
                  type="text"
                  className={styles.linkInput}
                  placeholder="Link title"
                  value={currentLinkTitle}
                  onChange={(e) => setCurrentLinkTitle(e.target.value)}
                  disabled={isProcessing}
                />

                <input
                  type="text"
                  className={styles.linkInput}
                  placeholder="URL (https://...)"
                  value={currentLinkUrl}
                  onChange={(e) => setCurrentLinkUrl(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className={styles.linkDescriptionContainer}>
                <textarea
                  className={styles.linkDescriptionInput}
                  placeholder="Description (optional)"
                  value={currentLinkDescription}
                  onChange={(e) => setCurrentLinkDescription(e.target.value)}
                  rows={2}
                  disabled={isProcessing}
                ></textarea>

                <button
                  type="button"
                  className={styles.addLinkButton}
                  onClick={addCreatorLink}
                  disabled={isProcessing}
                >
                  Add Link
                </button>
              </div>
            </div>

            {creatorLinks.length > 0 && (
              <div className={styles.creatorLinksContainer}>
                {creatorLinks.map((link) => (
                  <div key={link.id} className={styles.creatorLinkItem}>
                    <div className={styles.creatorLinkInfo}>
                      <div className={styles.creatorLinkTitle}>{link.title}</div>
                      <div className={styles.creatorLinkUrl}>{link.url}</div>
                      {link.description && (
                        <div className={styles.creatorLinkDescription}>
                          {link.description}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.removeLinkButton}
                      onClick={() => removeCreatorLink(link.id)}
                      disabled={isProcessing}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`${styles.submitButton} ${(!isFormValid || isProcessing) ? styles.submitButtonDisabled : ''}`}
            disabled={isProcessing || !isFormValid}
          >
            {isProcessing ? 'Processing...' : 'Create Discussion'}
          </button>
        </form>
      </div>
    </div>
  );
}