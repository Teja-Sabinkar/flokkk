'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import styles from './page.module.css';

// Mock user data for testing layout
const MOCK_USER = {
  _id: '12345',
  id: '12345',
  name: 'Alex Johnson',
  username: 'alexjohnson',
  email: 'alex@example.com',
  profilePicture: 'https://picsum.photos/seed/alex/200/200',
  avatar: 'https://picsum.photos/seed/alex/200/200',
  notifications: 5,
  isVerified: true
};

// Enhanced mock post data for better visualization
const MOCK_POST = {
  _id: '1',
  title: 'Getting Started with React Hooks: A Comprehensive Guide',
  content: `React Hooks are a powerful way to add state and lifecycle features to functional components without writing a class. 

Introduced in React 16.8, hooks have revolutionized how developers build React applications by allowing you to "hook into" React features directly from your function components.

## Why Use Hooks?

1. They let you use state and other React features without writing classes
2. They help organize related code together instead of splitting it based on lifecycle methods
3. They enable you to reuse stateful logic across components

## Common Hooks

### useState

The useState hook lets you add state to functional components:

\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
\`\`\`

### useEffect

The useEffect hook lets you perform side effects in function components:

\`\`\`jsx
function ExampleComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(result => setData(result));
    
    return () => {
      // Cleanup code goes here
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Rest of component
}
\`\`\`

## Custom Hooks

One of the most powerful features of hooks is the ability to create your own custom hooks that encapsulate reusable logic.`,
  status: 'published',
  createdAt: '2025-05-10T14:20:00Z',
  updatedAt: '2025-05-15T09:45:12Z',
  metrics: {
    views: 2347,
    uniqueViewers: 1839,
    comments: 41,
    contributions: 12,
    saves: 89,
    shares: 34
  },
  viewsHistory: [
    { date: '2025-05-10', views: 432 },
    { date: '2025-05-11', views: 567 },
    { date: '2025-05-12', views: 328 },
    { date: '2025-05-13', views: 293 },
    { date: '2025-05-14', views: 451 },
    { date: '2025-05-15', views: 276 }
  ],
  tags: ['react', 'javascript', 'hooks', 'frontend', 'webdev'],
  thumbnail: '/thumbnails/react-hooks-guide.jpg',
  thumbnailPreview: 'https://picsum.photos/seed/react-hooks/800/450',
  links: [
    {
      id: 'link1',
      title: 'React Hooks Documentation',
      url: 'https://reactjs.org/docs/hooks-intro.html',
      type: 'official',
      votes: 45
    },
    {
      id: 'link2',
      title: 'A Complete Guide to useEffect',
      url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
      type: 'article',
      votes: 32
    },
    {
      id: 'link3',
      title: 'Custom React Hooks Examples',
      url: 'https://usehooks.com/',
      type: 'resource',
      votes: 28
    }
  ]
};

export default function EditPostPage({ params }) {
  const postId = params?.id || '1';
  const router = useRouter();
  const [user, setUser] = useState(MOCK_USER);
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

  // Fetch post data
  useEffect(() => {
    // In a real app, you would make an API call to get the post data
    // For now, we'll simulate it with a timeout and our enhanced mock data
    const timer = setTimeout(() => {
      setPost(MOCK_POST);
      setFormData({
        title: MOCK_POST.title || '',
        content: MOCK_POST.content || '',
        tags: (MOCK_POST.tags || []).join(', '),
        status: MOCK_POST.status || 'published'
      });
      setLinks(MOCK_POST.links || []);
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [postId]);

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
      const updatedPost = {
        ...post,
        title: formData.title,
        content: formData.content,
        status: formData.status,
        tags: processedTags,
        links: links
      };
      
      // In a real app, you would make an API call to update the post
      // For now, we'll simulate success with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate updating the local state
      setPost(updatedPost);
      
      // Show success message
      alert('Post updated successfully!');
      
      // Redirect back to studio page after successful update
      // router.push('/studio');
      
    } catch (err) {
      console.error('Error saving post:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
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
                      {post.thumbnailPreview ? (
                        <img 
                          src={post.thumbnailPreview} 
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
                      <button type="button" className={styles.thumbnailUploadButton}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload new thumbnail
                      </button>
                      {post.thumbnailPreview && (
                        <button type="button" className={styles.thumbnailRemoveButton}>
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
                    <h3>Views</h3>
                    <p className={styles.metricValue}>{post.metrics?.views.toLocaleString()}</p>
                    <p className={styles.metricSubtext}>{post.metrics?.uniqueViewers.toLocaleString()} unique viewers</p>
                  </div>
                  
                  <div className={styles.metricItem}>
                    <h3>Comments</h3>
                    <p className={styles.metricValue}>{post.metrics?.comments.toLocaleString()}</p>
                  </div>
                  
                  <div className={styles.metricItem}>
                    <h3>Contributions</h3>
                    <p className={styles.metricValue}>{post.metrics?.contributions.toLocaleString()}</p>
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
                        <span className={styles.engagementValue}>{post.metrics?.saves}</span>
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
                        <span className={styles.engagementValue}>{post.metrics?.shares}</span>
                        <span className={styles.engagementLabel}>Shares</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* View History Chart */}
                <div className={styles.analyticsChartSection}>
                  <h3 className={styles.cardTitle}>View History</h3>
                  <div className={styles.viewHistoryChart}>
                    {post.viewsHistory.map((day, index) => (
                      <div key={index} className={styles.chartBar}>
                        <div 
                          className={styles.chartBarFill} 
                          style={{ 
                            height: `${(day.views / Math.max(...post.viewsHistory.map(d => d.views)) * 100)}%` 
                          }}
                        >
                          <span className={styles.chartTooltip}>{day.views} views on {day.date}</span>
                        </div>
                        <span className={styles.chartLabel}>{day.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Recommendations Section */}
                <div className={styles.recommendationsSection}>
                  <h3 className={styles.cardTitle}>Suggested Improvements</h3>
                  <ul className={styles.recommendationsList}>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Add more code examples to improve engagement
                    </li>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Include a section on useContext hook
                    </li>
                    <li className={styles.recommendationItem}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 8v4l3 3"></path>
                      </svg>
                      Add screenshots or diagrams for visual learners
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