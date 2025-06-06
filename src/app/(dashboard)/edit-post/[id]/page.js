'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import RemoveCommunityLink from '@/components/studio/RemoveCommunityLink';
import { getPostById, updatePost } from '@/lib/posts';
import styles from './page.module.css';

export default function EditPostPage({ params }) {
  const resolvedParams = use(params);
  const postId = resolvedParams?.id;

  const router = useRouter();
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'published',
    title: '',
    content: '',
    tags: ''
  });

  // Creator Links state
  const [creatorLinks, setCreatorLinks] = useState([]);
  const [newCreatorLink, setNewCreatorLink] = useState({ title: '', url: '', description: '' });

  // Community Links state - NOW EDITABLE
  const [communityLinks, setCommunityLinks] = useState([]);

  // NEW: Search state for filtering links
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);

  // YouTube post detection and protection
  const [isYouTubePost, setIsYouTubePost] = useState(false);
  const [youtubeChannelHashtag, setYoutubeChannelHashtag] = useState(null);

  // NEW: Remove Community Link Modal State
  const [removeLinkModal, setRemoveLinkModal] = useState({
    isOpen: false,
    linkData: null,
    linkIndex: null
  });

  // Helper functions for YouTube detection
  const detectYouTubePost = (postData) => {
    if (!postData) return false;
    const hasYouTubeUrl = postData.videoUrl && (
      postData.videoUrl.includes('youtube.com') ||
      postData.videoUrl.includes('youtu.be')
    );
    const hasYouTubeThumbnail = postData.image && (
      postData.image.includes('i.ytimg.com') ||
      postData.image.includes('img.youtube.com')
    );
    return hasYouTubeUrl || hasYouTubeThumbnail;
  };

  const identifyYouTubeChannelHashtag = (hashtags, videoUrl) => {
    if (!hashtags || !Array.isArray(hashtags) || !videoUrl) return null;
    const channelHashtags = hashtags.filter(tag => {
      return tag.length > 3 && tag.length < 50 && !tag.includes(' ');
    });
    return channelHashtags.length > 0 ? channelHashtags[0] : null;
  };

  const getDisplayTags = (allTags, protectedHashtag) => {
    if (!allTags || !protectedHashtag) return allTags;
    return allTags.filter(tag => {
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const normalizedProtected = protectedHashtag.startsWith('#') ? protectedHashtag : `#${protectedHashtag}`;
      return normalizedTag !== normalizedProtected;
    });
  };

  const getAllTagsForPreview = () => {
    let inputTags = formData.tags
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];

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

  // NEW: Filter links based on search query
  const filterLinks = (links) => {
    if (!linkSearchQuery.trim()) return links;

    const query = linkSearchQuery.toLowerCase();
    return links.filter(link => {
      const title = (link.title || '').toLowerCase();
      const url = (link.url || '').toLowerCase();
      const description = (link.description || '').toLowerCase();

      return title.includes(query) ||
        url.includes(query) ||
        description.includes(query);
    });
  };

  // NEW: Handle search input change
  const handleLinkSearchChange = (e) => {
    setLinkSearchQuery(e.target.value);
  };

  // NEW: Clear search
  const clearLinkSearch = () => {
    setLinkSearchQuery('');
  };

  // Fetch post data and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const userResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to authenticate. Please login again.');
        }

        const userData = await userResponse.json();
        setUser(userData);

        if (!postId) {
          throw new Error('Post ID is required');
        }

        const postData = await getPostById(postId, token);
        setPost(postData);

        const isYouTube = detectYouTubePost(postData);
        setIsYouTubePost(isYouTube);

        let protectedHashtag = null;
        if (isYouTube) {
          protectedHashtag = postData.youtubeChannelHashtag ||
            identifyYouTubeChannelHashtag(postData.hashtags, postData.videoUrl);
          setYoutubeChannelHashtag(protectedHashtag);
        }

        const allHashtags = postData.hashtags || [];
        let displayTags = allHashtags;

        if (isYouTube && protectedHashtag) {
          displayTags = getDisplayTags(allHashtags, protectedHashtag);
        }

        setFormData({
          status: postData.status || 'published',
          title: postData.title || '',
          content: postData.content || '',
          tags: displayTags.join(', ')
        });

        setCreatorLinks(postData.creatorLinks || []);
        setCommunityLinks(postData.communityLinks || []); // SET COMMUNITY LINKS

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Thumbnail handlers with YouTube restriction
  const handleThumbnailChange = (e) => {
    if (isYouTubePost) return;
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setRemoveThumbnail(false);
      const reader = new FileReader();
      reader.onload = (event) => {
        post.thumbnailPreview = event.target.result;
        setPost({ ...post });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    if (isYouTubePost) return;
    setThumbnailFile(null);
    setRemoveThumbnail(true);
    post.thumbnailPreview = null;
    setPost({ ...post });
  };

  // Handle creator link changes
  const handleCreatorLinkChange = (e) => {
    const { name, value } = e.target;
    setNewCreatorLink(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCreatorLink = (e) => {
    e.preventDefault();
    if (!newCreatorLink.title || !newCreatorLink.url) return;

    setCreatorLinks(prev => [...prev, {
      ...newCreatorLink,
      id: `temp-${Date.now()}`
    }]);
    setNewCreatorLink({ title: '', url: '', description: '' });
  };

  const handleRemoveCreatorLink = (linkId) => {
    setCreatorLinks(prev => prev.filter(link => link.id !== linkId));
  };

  // UPDATED: Handle community link removal with confirmation modal
  const handleRemoveCommunityLink = (linkIndex) => {
    const linkToRemove = communityLinks[linkIndex];
    setRemoveLinkModal({
      isOpen: true,
      linkData: linkToRemove,
      linkIndex: linkIndex
    });
  };

  // NEW: Confirm community link removal
  const confirmRemoveCommunityLink = async () => {
    if (removeLinkModal.linkIndex !== null) {
      setCommunityLinks(prev => prev.filter((_, index) => index !== removeLinkModal.linkIndex));
    }
  };

  // NEW: Close remove link modal
  const closeRemoveLinkModal = () => {
    setRemoveLinkModal({
      isOpen: false,
      linkData: null,
      linkIndex: null
    });
  };

  // Modified hashtag removal with YouTube protection
  const removeHashtag = (tagToRemove) => {
    if (tagToRemove === youtubeChannelHashtag) return;

    const currentTags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    const updatedTags = currentTags.filter(tag => {
      const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
      const normalizedToRemove = tagToRemove.startsWith('#') ? tagToRemove : `#${tagToRemove}`;
      return normalizedTag !== normalizedToRemove;
    });

    setFormData(prev => ({ ...prev, tags: updatedTags.join(', ') }));
  };

  // UPDATED: Handle form submission with community links
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let processedTags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

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

      const updatedPostData = {
        status: formData.status,
        title: formData.title,
        content: formData.content,
        tags: processedTags,
        links: creatorLinks,
        communityLinks: communityLinks, // INCLUDE COMMUNITY LINKS
        thumbnailFile: thumbnailFile,
        removeThumbnail: removeThumbnail
      };

      console.log('Updating post with community links:', communityLinks);

      const result = await updatePost(postId, updatedPostData);
      setPost(result.post);

      // DISPATCH CUSTOM EVENT FOR REAL-TIME UPDATE
      window.dispatchEvent(new CustomEvent('post-updated', {
        detail: {
          postId: postId,
          updatedPost: result.post,
          communityLinks: communityLinks
        }
      }));

      alert('Post updated successfully!');

    } catch (err) {
      console.error('Error saving post:', err);
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/studio');
  };

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
        <button className={styles.retryButton} onClick={() => router.push('/studio')}>
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
        <div className={styles.sidebarContainer}>
          <DiscussionPageSidebarNavigation isOpen={isMobileMenuOpen} />
        </div>

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
              <div className={styles.errorMessage}>{submitError}</div>
            )}

            <div className={styles.postInfo}>
              <div className={styles.postDates}>
                <span>Created: {formatDate(post.createdAt)}</span>
                <span>Last Updated: {formatDate(post.updatedAt)}</span>
              </div>
              <div className={styles.postStatus}>
                <span className={post.status === 'published' ? styles.publishedStatus : styles.draftStatus}>
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>

            <div className={styles.editFormContainer}>

              {/* Status field */}
              <div className={styles.formGroup}>
                <label htmlFor="status" className={styles.formLabel}>Status</label>
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
                <label htmlFor="title" className={styles.formLabel}>Title</label>
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

              {/* Thumbnail section */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Thumbnail</label>

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
                <label htmlFor="content" className={styles.formLabel}>Content</label>
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

              {/* Tags field */}
              <div className={styles.formGroup}>
                <label htmlFor="tags" className={styles.formLabel}>Tags (comma-separated)</label>

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
                {getAllTagsForPreview().length > 0 && (
                  <div className={styles.tagsPreview}>
                    {getAllTagsForPreview().map((tag, index) => (
                      tag.trim() && (
                        <span key={index} className={styles.tagItem}>
                          #{tag.trim()}
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

              {/* Links section - UPDATED WITH SEARCH BAR */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Links</label>

                {/* NEW: Search Bar for Links */}
                <div className={styles.linkSearchContainer}>
                  <input
                    type="text"
                    placeholder="Search links by title, URL, or description..."
                    className={styles.linkSearchInput}
                    value={linkSearchQuery}
                    onChange={handleLinkSearchChange}
                  />
                  {linkSearchQuery && (
                    <button
                      className={styles.linkSearchClearButton}
                      onClick={clearLinkSearch}
                      title="Clear search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                  <div className={styles.linkSearchIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>

                <div className={styles.linksContainer}>

                  {/* Creator Links Section */}
                  <div className={styles.linksSectionContainer}>
                    <h4 className={styles.linksSectionTitle}>Creator Links</h4>
                    <div className={styles.linksSection}>

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


                      {(() => {
                        const filteredCreatorLinks = filterLinks(creatorLinks);

                        return (
                          <>
                            {creatorLinks.length > 0 ? (
                              filteredCreatorLinks.length > 0 ? (
                                <div className={styles.linksList}>
                                  {filteredCreatorLinks.map((link, index) => (
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
                                <div className={styles.noResultsMessage}>
                                  No results found for "{linkSearchQuery}"
                                </div>
                              )
                            ) : (
                              <p className={styles.noLinks}>No creator links added yet</p>
                            )}
                          </>
                        );
                      })()}

                    </div>
                  </div>

                  {/* Community Links Section - NOW EDITABLE WITH SEARCH FILTERING */}
                  <div className={styles.linksSectionContainer}>
                    <h4 className={styles.linksSectionTitle}>Community Links</h4>
                    <div className={styles.linksSection}>
                      {(() => {
                        const filteredCommunityLinks = filterLinks(communityLinks);

                        return (
                          <>
                            {communityLinks.length > 0 ? (
                              filteredCommunityLinks.length > 0 ? (
                                <div className={styles.linksList}>
                                  {filteredCommunityLinks.map((link, index) => {
                                    // Find the original index for removal
                                    const originalIndex = communityLinks.findIndex(originalLink =>
                                      originalLink.title === link.title &&
                                      originalLink.url === link.url &&
                                      originalLink.contributorUsername === link.contributorUsername
                                    );

                                    return (
                                      <div key={index} className={styles.linkItem}>
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
                                        {/* UPDATED: Remove button now opens confirmation modal */}
                                        <button
                                          className={styles.removeLink}
                                          onClick={() => handleRemoveCommunityLink(originalIndex)}
                                          aria-label="Remove community link"
                                          title="Remove this community link"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className={styles.noResultsMessage}>
                                  No results found for "{linkSearchQuery}"
                                </div>
                              )
                            ) : (
                              <p className={styles.noLinks}>No community links yet</p>
                            )}
                          </>
                        );
                      })()}

                      <div className={styles.communityLinksNote}>
                        <p>You can remove community links contributed by your followers.</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={handleMenuToggle}></div>
        )}
      </div>

      {/* Remove Community Link Confirmation Modal */}
      <RemoveCommunityLink
        isOpen={removeLinkModal.isOpen}
        onClose={closeRemoveLinkModal}
        onConfirm={confirmRemoveCommunityLink}
        linkData={removeLinkModal.linkData}
      />
    </div>
  );
}