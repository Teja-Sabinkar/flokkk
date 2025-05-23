'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import { getPostById, updatePost } from '@/lib/posts';
import styles from './page.module.css';

export default function EditPostPage({ params }) {
  const postId = params?.id;
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'published', // Moved to top
    title: '',
    content: '',
    tags: ''
  });
  
  // Creator Links state
  const [creatorLinks, setCreatorLinks] = useState([]);
  const [newCreatorLink, setNewCreatorLink] = useState({ title: '', url: '', description: '' });
  
  // Community Links state (display only)
  const [communityLinks, setCommunityLinks] = useState([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  
  // YouTube post detection and protection
  const [isYouTubePost, setIsYouTubePost] = useState(false);
  const [youtubeChannelHashtag, setYoutubeChannelHashtag] = useState(null);

  // Helper function to detect YouTube posts
  const detectYouTubePost = (postData) => {
    if (!postData) return false;
    
    // Check if videoUrl contains YouTube domains
    const hasYouTubeUrl = postData.videoUrl && (
      postData.videoUrl.includes('youtube.com') || 
      postData.videoUrl.includes('youtu.be')
    );
    
    // Check if thumbnail URL contains YouTube domains
    const hasYouTubeThumbnail = postData.image && (
      postData.image.includes('i.ytimg.com') || 
      postData.image.includes('img.youtube.com')
    );
    
    return hasYouTubeUrl || hasYouTubeThumbnail;
  };

  // Helper function to identify YouTube channel hashtag from hashtags
  const identifyYouTubeChannelHashtag = (hashtags, videoUrl) => {
    if (!hashtags || !Array.isArray(hashtags) || !videoUrl) return null;
    
    // For existing posts, we'll try to identify the channel hashtag
    // This is a best-effort approach for posts created before this feature
    const channelHashtags = hashtags.filter(tag => {
      // Look for hashtags that might be channel names (no spaces, reasonable length)
      return tag.length > 3 && tag.length < 50 && !tag.includes(' ');
    });
    
    // Return the first potential channel hashtag (this is a heuristic)
    return channelHashtags.length > 0 ? channelHashtags[0] : null;
  };

  // Helper function to filter out YouTube channel hashtag from display
  const getDisplayTags = (allTags, protectedHashtag) => {
    if (!allTags || !protectedHashtag) return allTags;
    
    return allTags.filter(tag => {
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const normalizedProtected = protectedHashtag.startsWith('#') ? protectedHashtag : `#${protectedHashtag}`;
      return normalizedTag !== normalizedProtected;
    });
  };

  // Helper function to get all tags for preview (including protected)
  const getAllTagsForPreview = () => {
    let inputTags = formData.tags
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];
    
    // Add YouTube channel hashtag if it exists and isn't already in the list
    if (youtubeChannelHashtag) {
      const normalizedProtected = youtubeChannelHashtag.startsWith('#') ? youtubeChannelHashtag : `#${youtubeChannelHashtag}`;
      const hasProtectedTag = inputTags.some(tag => {
        const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
        return normalizedTag === normalizedProtected;
      });
      
      if (!hasProtectedTag) {
        inputTags.push(youtubeChannelHashtag);
      }
    }
    
    return inputTags;
  };

  // Fetch post data and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check for token
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Get current user
        const userResponse = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to authenticate. Please login again.');
        }

        const userData = await userResponse.json();
        setUser(userData);

        // Get post data
        if (!postId) {
          throw new Error('Post ID is required');
        }

        const postData = await getPostById(postId, token);

        setPost(postData);
        
        // Detect if this is a YouTube post
        const isYouTube = detectYouTubePost(postData);
        setIsYouTubePost(isYouTube);
        console.log('YouTube post detected:', isYouTube);
        
        // Identify protected YouTube channel hashtag
        let protectedHashtag = null;
        if (isYouTube) {
          // First check if it's stored in the post data (for future implementations)
          protectedHashtag = postData.youtubeChannelHashtag;
          
          // If not stored, try to identify it from existing hashtags
          if (!protectedHashtag) {
            protectedHashtag = identifyYouTubeChannelHashtag(postData.hashtags, postData.videoUrl);
          }
          
          setYoutubeChannelHashtag(protectedHashtag);
          console.log('Protected YouTube channel hashtag:', protectedHashtag);
        }
        
        // Filter out YouTube channel hashtag from input display
        const allHashtags = postData.hashtags || [];
        let displayTags = allHashtags;
        
        if (isYouTube && protectedHashtag) {
          displayTags = getDisplayTags(allHashtags, protectedHashtag);
        }
        
        setFormData({
          status: postData.status || 'published',
          title: postData.title || '',
          content: postData.content || '',
          tags: displayTags.join(', ') // Only show non-protected tags in input
        });
        
        // Set creator links
        setCreatorLinks(postData.creatorLinks || []);
        
        // Set community links (read-only)
        setCommunityLinks(postData.communityLinks || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load post data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [postId, router]);

  // Handle menu toggle
  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Thumbnail change handler with YouTube restriction
  const handleThumbnailChange = (e) => {
    // Prevent thumbnail changes for YouTube posts
    if (isYouTubePost) {
      console.log('Thumbnail change blocked: YouTube post detected');
      return;
    }

    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setRemoveThumbnail(false);

      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        post.thumbnailPreview = event.target.result;
        setPost({ ...post });
      };
      reader.readAsDataURL(file);
    }
  };

  // Thumbnail removal handler with YouTube restriction
  const handleRemoveThumbnail = () => {
    // Prevent thumbnail removal for YouTube posts
    if (isYouTubePost) {
      console.log('Thumbnail removal blocked: YouTube post detected');
      return;
    }

    setThumbnailFile(null);
    setRemoveThumbnail(true);
    post.thumbnailPreview = null;
    setPost({ ...post });
  };

  // Handle new creator link input changes
  const handleCreatorLinkChange = (e) => {
    const { name, value } = e.target;
    setNewCreatorLink(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new creator link
  const handleAddCreatorLink = (e) => {
    e.preventDefault();

    if (!newCreatorLink.title || !newCreatorLink.url) {
      return; // Don't add empty links
    }

    // Add new link with a temporary ID
    setCreatorLinks(prev => [
      ...prev,
      {
        ...newCreatorLink,
        id: `temp-${Date.now()}`
      }
    ]);

    // Reset new link form
    setNewCreatorLink({ title: '', url: '', description: '' });
  };

  // Remove a creator link
  const handleRemoveCreatorLink = (linkId) => {
    setCreatorLinks(prev => prev.filter(link => link.id !== linkId));
  };

  // Modified remove hashtag with YouTube channel protection
  const removeHashtag = (tagToRemove) => {
    // Don't remove if this is the protected YouTube channel hashtag
    if (tagToRemove === youtubeChannelHashtag) {
      console.log('Cannot remove protected YouTube channel hashtag:', tagToRemove);
      return;
    }
    
    // Remove the hashtag from the tags string
    const currentTags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const updatedTags = currentTags.filter(tag => {
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const normalizedToRemove = tagToRemove.startsWith('#') ? tagToRemove : `#${tagToRemove}`;
      return normalizedTag !== normalizedToRemove;
    });
    
    setFormData(prev => ({
      ...prev,
      tags: updatedTags.join(', ')
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Process tags - combine input tags with protected YouTube hashtag
      let processedTags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      // Add YouTube channel hashtag back if it exists and isn't already included
      if (youtubeChannelHashtag) {
        const normalizedProtected = youtubeChannelHashtag.startsWith('#') ? youtubeChannelHashtag : `#${youtubeChannelHashtag}`;
        const hasProtectedTag = processedTags.some(tag => {
          const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
          return normalizedTag === normalizedProtected;
        });
        
        if (!hasProtectedTag) {
          processedTags.push(youtubeChannelHashtag);
        }
      }

      // Prepare updated post data
      const updatedPostData = {
        status: formData.status,
        title: formData.title,
        content: formData.content,
        tags: processedTags, // Include protected hashtag
        links: creatorLinks, // Send creator links
        thumbnailFile: thumbnailFile,
        removeThumbnail: removeThumbnail
      };

      // Make API call to update post
      const result = await updatePost(postId, updatedPostData);

      // Update local state
      setPost(result.post);

      // Show success message
      alert('Post updated successfully!');

      // Redirect back to studio page after successful update
      router.push('/studio');

    } catch (err) {
      console.error('Error saving post:', err);
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancellation
  const handleCancel = () => {
    router.push('/studio');
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button
          className={styles.retryButton}
          onClick={() => router.push('/studio')}
        >
          Back to Studio
        </button>
      </div>
    );
  }

  return (
    <div className={styles.editPostPage}>
      <DiscussionPageHeader
        user={user}
        onMenuToggle={handleMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className={styles.mainContent}>
        {/* Sidebar navigation */}
        <div className={styles.sidebarContainer}>
          <DiscussionPageSidebarNavigation isOpen={isMobileMenuOpen} />
        </div>

        {/* Main content area */}
        <div className={`${styles.contentContainer} ${isMobileMenuOpen ? styles.menuOpen : ''}`}>
          <div className={styles.editPostContent}>
            <div className={styles.editPostHeader}>
              <h1 className={styles.editPostTitle}>Edit Post</h1>
              <div className={styles.headerActions}>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className={styles.buttonSpinner}></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>

            {submitError && (
              <div className={styles.errorMessage}>
                {submitError}
              </div>
            )}

            <div className={styles.postInfo}>
              <div className={styles.postDates}>
                <span>Created: {formatDate(post.createdAt)}</span>
                <span>Last Updated: {formatDate(post.updatedAt)}</span>
              </div>
              <div className={styles.postStatus}>
                <span className={
                  post.status === 'published'
                    ? styles.publishedStatus
                    : styles.draftStatus
                }>
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>

            {/* REMOVED: editPostLayout grid - now single column */}
            <div className={styles.editFormContainer}>
              
              {/* Status field - moved to top */}
              <div className={styles.formGroup}>
                <label htmlFor="status" className={styles.formLabel}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={styles.formSelect}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Title field */}
              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.formLabel}>
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Enter post title"
                  required
                />
              </div>

              {/* Thumbnail section with YouTube restrictions */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Thumbnail</label>
                
                {/* YouTube restriction notice */}
                {isYouTubePost && (
                  <div className={styles.youtubeNotice}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    YouTube video thumbnails cannot be modified
                  </div>
                )}
                
                <div className={styles.thumbnailSection}>
                  <div className={styles.thumbnailPreview}>
                    {post.thumbnailPreview || post.image ? (
                      <img
                        src={post.thumbnailPreview || post.image}
                        alt="Post thumbnail"
                        className={styles.thumbnailImage}
                      />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>No thumbnail</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Conditionally disabled thumbnail actions */}
                  <div className={styles.thumbnailActions}>
                    <label 
                      htmlFor="thumbnailInput" 
                      className={`${styles.thumbnailUploadButton} ${isYouTubePost ? styles.disabledButton : ''}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      {isYouTubePost ? 'Cannot change YouTube thumbnail' : 'Upload new thumbnail'}
                    </label>
                    <input
                      type="file"
                      id="thumbnailInput"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={isYouTubePost}
                    />
                    {(post.thumbnailPreview || post.image) && (
                      <button
                        type="button"
                        className={`${styles.thumbnailRemoveButton} ${isYouTubePost ? styles.disabledButton : ''}`}
                        onClick={handleRemoveThumbnail}
                        disabled={isYouTubePost}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        {isYouTubePost ? 'Cannot remove YouTube thumbnail' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.thumbnailInfo}>
                  Recommended size: 1200 × 630 pixels (16:9 ratio)
                </div>
              </div>

              {/* Content field */}
              <div className={styles.formGroup}>
                <label htmlFor="content" className={styles.formLabel}>
                  Content
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  className={styles.formTextarea}
                  placeholder="Enter post content"
                  rows={16}
                  required
                />
              </div>

              {/* Tags field with YouTube channel hashtag protection */}
              <div className={styles.formGroup}>
                <label htmlFor="tags" className={styles.formLabel}>
                  Tags (comma-separated)
                </label>
                
                {/* YouTube channel hashtag protection notice */}
                {isYouTubePost && youtubeChannelHashtag && (
                  <div className={styles.youtubeNotice}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    YouTube channel hashtag "{youtubeChannelHashtag}" cannot be removed
                  </div>
                )}
                
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="technology, news, discussion"
                />
                {/* Show all tags including protected hashtag in preview */}
                {getAllTagsForPreview().length > 0 && (
                  <div className={styles.tagsPreview}>
                    {getAllTagsForPreview().map((tag, index) => (
                      tag.trim() && (
                        <span key={index} className={styles.tagItem}>
                          #{tag.trim()}
                          {/* Show remove button unless it's the protected YouTube hashtag */}
                          {!(isYouTubePost && youtubeChannelHashtag && 
                            (tag.trim() === youtubeChannelHashtag || `#${tag.trim()}` === youtubeChannelHashtag)) && (
                            <button
                              type="button"
                              className={styles.removeTagButton}
                              onClick={() => removeHashtag(tag.trim())}
                              aria-label="Remove tag"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Links section - now side by side */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Links</label>
                <div className={styles.linksContainer}>
                  
                  {/* Creator Links Section */}
                  <div className={styles.linksSectionContainer}>
                    <h4 className={styles.linksSectionTitle}>Creator Links</h4>
                    <div className={styles.linksSection}>
                      {creatorLinks.length > 0 ? (
                        <div className={styles.linksList}>
                          {creatorLinks.map((link, index) => (
                            <div key={link.id || index} className={styles.linkItem}>
                              <div className={styles.linkInfo}>
                                <h4 className={styles.linkTitle}>{link.title}</h4>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.linkUrl}
                                >
                                  {link.url}
                                </a>
                                {link.description && (
                                  <p className={styles.linkDescription}>{link.description}</p>
                                )}
                                <div className={styles.linkMeta}>
                                  <span className={styles.linkType}>Creator</span>
                                  {link.voteCount !== undefined && (
                                    <span className={styles.linkVotes}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18v-6H5l7-7 7 7h-4v6H9z"></path>
                                      </svg>
                                      {link.voteCount || link.votes || 0}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className={styles.removeLink}
                                onClick={() => handleRemoveCreatorLink(link.id || index)}
                                aria-label="Remove link"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noLinks}>No creator links added yet</p>
                      )}

                      {/* Add new creator link form */}
                      <div className={styles.addLinkForm}>
                        <h4 className={styles.addLinkHeading}>Add Creator Link</h4>
                        <div className={styles.linkFormGroup}>
                          <input
                            type="text"
                            name="title"
                            value={newCreatorLink.title}
                            onChange={handleCreatorLinkChange}
                            className={styles.linkInput}
                            placeholder="Link title"
                          />
                        </div>
                        <div className={styles.linkFormGroup}>
                          <input
                            type="url"
                            name="url"
                            value={newCreatorLink.url}
                            onChange={handleCreatorLinkChange}
                            className={styles.linkInput}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className={styles.linkFormGroup}>
                          <textarea
                            name="description"
                            value={newCreatorLink.description}
                            onChange={handleCreatorLinkChange}
                            className={styles.linkTextarea}
                            placeholder="Link description (optional)"
                            rows={2}
                          />
                        </div>
                        <button
                          className={styles.addLinkButton}
                          onClick={handleAddCreatorLink}
                        >
                          Add Creator Link
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Community Links Section - Display Only */}
                  <div className={styles.linksSectionContainer}>
                    <h4 className={styles.linksSectionTitle}>Community Links</h4>
                    <div className={styles.linksSection}>
                      {communityLinks.length > 0 ? (
                        <div className={styles.linksList}>
                          {communityLinks.map((link, index) => (
                            <div key={index} className={styles.linkItemReadonly}>
                              <div className={styles.linkInfo}>
                                <h4 className={styles.linkTitle}>{link.title}</h4>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.linkUrl}
                                >
                                  {link.url}
                                </a>
                                {link.description && (
                                  <p className={styles.linkDescription}>{link.description}</p>
                                )}
                                <div className={styles.linkMeta}>
                                  <span className={styles.linkType}>Community</span>
                                  <span className={styles.linkContributor}>
                                    by @{link.contributorUsername}
                                  </span>
                                  <span className={styles.linkVotes}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M9 18v-6H5l7-7 7 7h-4v6H9z"></path>
                                    </svg>
                                    {link.voteCount || link.votes || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noLinks}>No community links yet</p>
                      )}
                      <div className={styles.communityLinksNote}>
                        <p>Community links are contributed by your followers and cannot be edited here.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay for mobile when menu is open */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={handleMenuToggle}></div>
        )}
      </div>
    </div>
  );
}