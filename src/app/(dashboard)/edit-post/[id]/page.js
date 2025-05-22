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
    title: '',
    content: '',
    tags: '',
    status: 'published'
  });
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', type: 'resource' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);

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
        setFormData({
          title: postData.title || '',
          content: postData.content || '',
          tags: (postData.hashtags || []).join(', '),
          status: postData.status || 'published'
        });
        setLinks(postData.creatorLinks || []);
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

  // Handle thumbnail upload
  const handleThumbnailChange = (e) => {
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

  // Handle thumbnail removal
  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setRemoveThumbnail(true);
    post.thumbnailPreview = null;
    setPost({ ...post });
  };

  // Handle new link input changes
  const handleLinkChange = (e) => {
    const { name, value } = e.target;
    setNewLink(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new link
  const handleAddLink = (e) => {
    e.preventDefault();

    if (!newLink.title || !newLink.url) {
      return; // Don't add empty links
    }

    // Add new link with a temporary ID
    setLinks(prev => [
      ...prev,
      {
        ...newLink,
        id: `temp-${Date.now()}`,
        votes: 0
      }
    ]);

    // Reset new link form
    setNewLink({ title: '', url: '', type: 'resource' });
  };

  // Remove a link
  const handleRemoveLink = (linkId) => {
    setLinks(prev => prev.filter(link => link.id !== linkId));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Process tags
      const processedTags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      // Prepare updated post data
      const updatedPostData = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        tags: processedTags,
        links: links,
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

            <div className={styles.editPostLayout}>
              {/* Left side - Edit form */}
              <div className={styles.editFormContainer}>
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

                {/* Thumbnail section */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Thumbnail</label>
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
                      <label htmlFor="thumbnailInput" className={styles.thumbnailUploadButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload new thumbnail
                      </label>
                      <input
                        type="file"
                        id="thumbnailInput"
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleThumbnailChange}
                      />
                      {(post.thumbnailPreview || post.image) && (
                        <button
                          type="button"
                          className={styles.thumbnailRemoveButton}
                          onClick={handleRemoveThumbnail}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.thumbnailInfo}>
                    Recommended size: 1200 × 630 pixels (16:9 ratio)
                  </div>
                </div>

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

                <div className={styles.formGroup}>
                  <label htmlFor="tags" className={styles.formLabel}>
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="technology, news, discussion"
                  />
                  {formData.tags && (
                    <div className={styles.tagsPreview}>
                      {formData.tags.split(',').map((tag, index) => (
                        tag.trim() && (
                          <span key={index} className={styles.tagItem}>
                            #{tag.trim()}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>

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

                {/* Links section with add/remove functionality */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Links</label>
                  <div className={styles.linksSection}>
                    {links.length > 0 ? (
                      <div className={styles.linksList}>
                        {links.map(link => (
                          <div key={link.id} className={styles.linkItem}>
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
                              <div className={styles.linkMeta}>
                                <span className={styles.linkType}>{link.type}</span>
                                <span className={styles.linkVotes}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18v-6H5l7-7 7 7h-4v6H9z"></path>
                                  </svg>
                                  {link.votes}
                                </span>
                              </div>
                            </div>
                            <button
                              className={styles.removeLink}
                              onClick={() => handleRemoveLink(link.id)}
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
                      <p className={styles.noLinks}>No links added yet</p>
                    )}

                    {/* Add new link form */}
                    <div className={styles.addLinkForm}>
                      <h4 className={styles.addLinkHeading}>Add New Link</h4>
                      <div className={styles.linkFormGroup}>
                        <input
                          type="text"
                          name="title"
                          value={newLink.title}
                          onChange={handleLinkChange}
                          className={styles.linkInput}
                          placeholder="Link title"
                        />
                      </div>
                      <div className={styles.linkFormGroup}>
                        <input
                          type="url"
                          name="url"
                          value={newLink.url}
                          onChange={handleLinkChange}
                          className={styles.linkInput}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className={styles.linkFormRow}>
                        <select
                          name="type"
                          value={newLink.type}
                          onChange={handleLinkChange}
                          className={styles.linkTypeSelect}
                        >
                          <option value="resource">Resource</option>
                          <option value="article">Article</option>
                          <option value="video">Video</option>
                          <option value="official">Official</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          className={styles.addLinkButton}
                          onClick={handleAddLink}
                        >
                          Add Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Analytics */}
              <div className={styles.analyticsContainer}>
                <h2 className={styles.analyticsTitle}>Post Analytics</h2>

                <div className={styles.analyticsCard}>
                  <div className={styles.metricItem}>
                    <h3>Appeared</h3>
                    <p className={styles.metricValue}>{post.metrics?.appeared?.toLocaleString() || '0'}</p>
                    <p className={styles.metricSubtext}>viewed & Scrolled</p>
                  </div>

                  <div className={styles.metricItem}>
                    <h3>Viewed</h3>
                    <p className={styles.metricValue}>{post.metrics?.viewed?.toLocaleString() || '0'}</p>
                    <p className={styles.metricSubtext}>Video plays</p>
                  </div>

                  <div className={styles.metricItem}>
                    <h3>Penetration</h3>
                    <p className={styles.metricValue}>{post.metrics?.penetrate?.toLocaleString() || '0'}</p>
                    <p className={styles.metricSubtext}>Discussion opens</p>
                  </div>
                </div>

                <div className={styles.engagementCard}>
                  <h3 className={styles.cardTitle}>Engagement</h3>
                  <div className={styles.engagementStats}>
                    <div className={styles.engagementItem}>
                      <div className={styles.engagementIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <div className={styles.engagementInfo}>
                        <span className={styles.engagementValue}>{post.metrics?.saves || 0}</span>
                        <span className={styles.engagementLabel}>Saves</span>
                      </div>
                    </div>
                    <div className={styles.engagementItem}>
                      <div className={styles.engagementIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                      </div>
                      <div className={styles.engagementInfo}>
                        <span className={styles.engagementValue}>{post.metrics?.shares || 0}</span>
                        <span className={styles.engagementLabel}>Shares</span>
                      </div>
                    </div>
                    <div className={styles.engagementItem}>
                      <div className={styles.engagementIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                      </div>
                      <div className={styles.engagementInfo}>
                        <span className={styles.engagementValue}>{post.metrics?.comments || 0}</span>
                        <span className={styles.engagementLabel}>Comments</span>
                      </div>
                    </div>
                    <div className={styles.engagementItem}>
                      <div className={styles.engagementIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </div>
                      <div className={styles.engagementInfo}>
                        <span className={styles.engagementValue}>{post.metrics?.contributions || 0}</span>
                        <span className={styles.engagementLabel}>Contributions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View History Chart */}
                {post.viewsHistory && post.viewsHistory.length > 0 ? (
                  <div className={styles.analyticsChartSection}>
                    <h3 className={styles.cardTitle}>View History</h3>
                    <div className={styles.viewHistoryChart}>
                      {post.viewsHistory.map((day, index) => {
                        // Calculate the maximum views across all days for scaling
                        const maxViews = Math.max(...post.viewsHistory.map(d => d.views));
                        // Calculate height percentage based on max views
                        const heightPercentage = maxViews > 0
                          ? (day.views / maxViews * 100)
                          : 0;

                        return (
                          <div key={index} className={styles.chartBar}>
                            <div
                              className={styles.chartBarFill}
                              style={{ height: `${heightPercentage}%` }}
                            >
                              <span className={styles.chartTooltip}>{day.views} views on {day.date}</span>
                            </div>
                            <span className={styles.chartLabel}>{day.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={styles.analyticsChartSection}>
                    <h3 className={styles.cardTitle}>View History</h3>
                    <div className={styles.emptyChartMessage}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                        <line x1="3" y1="20" x2="21" y2="20"></line>
                      </svg>
                      <p>No view history data available yet.</p>
                    </div>
                  </div>
                )}

                {/* Content Recommendations Section */}
                <div className={styles.recommendationsSection}>
                  <h3 className={styles.cardTitle}>Suggested Improvements</h3>
                  <ul className={styles.recommendationsList}>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Add more visual content to improve engagement
                    </li>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Consider adding more resource links
                    </li>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Regularly update content to maintain engagement
                    </li>
                  </ul>
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