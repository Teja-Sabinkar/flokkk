'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiscussionPageHeader from '@/components/layout/DiscussionPageHeader/DiscussionPageHeader';
import DiscussionPageSidebarNavigation from '@/components/layout/DiscussionPageSidebarNavigation/DiscussionPageSidebarNavigation';
import { getPostById } from '@/lib/posts';
import styles from './page.module.css';

export default function EditPostAnalyticsPage({ params }) {
  const postId = params?.id;
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

        if (!postData) {
          throw new Error('Post not found');
        }

        // Check if user has permission to view analytics for this post
        if (postData.userId !== userData.id && postData.userId !== userData._id) {
          throw new Error('You do not have permission to view analytics for this post');
        }

        setPost(postData);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load post analytics');
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

  // Handle back to studio
  const handleBackToStudio = () => {
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
        <p>Loading analytics...</p>
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
    <div className={styles.analyticsPage}>
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
          <div className={styles.analyticsContent}>
            
            {/* Header with back button */}
            <div className={styles.analyticsHeader}>
              <button
                className={styles.backButton}
                onClick={handleBackToStudio}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"></path>
                  <path d="M12 19l-7-7 7-7"></path>
                </svg>
                Back to Studio
              </button>
              <h1 className={styles.analyticsTitle}>Post Analytics</h1>
            </div>

            {/* Post info */}
            <div className={styles.postInfo}>
              <div className={styles.postHeader}>
                <h2 className={styles.postTitle}>{post.title}</h2>
                <div className={styles.postMeta}>
                  <span className={
                    post.status === 'published'
                      ? styles.publishedStatus
                      : styles.draftStatus
                  }>
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span className={styles.postDate}>
                    Created: {formatDate(post.createdAt)}
                  </span>
                  <span className={styles.postDate}>
                    Updated: {formatDate(post.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Thumbnail and Engagement Row */}
            <div className={styles.thumbnailEngagementRow}>
              {/* Thumbnail Section */}
              <div className={styles.thumbnailSection}>
                <h3 className={styles.sectionTitle}>Thumbnail</h3>
                <div className={styles.thumbnailPreview}>
                  {post.image ? (
                    <img
                      src={post.image}
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
              </div>

              {/* Engagement stats */}
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
            </div>

            {/* Analytics Container */}
            <div className={styles.analyticsContainer}>
              
              {/* Main metrics */}
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
                  <h3 className={styles.cardTitle}>Appearance History</h3>
                  <div className={styles.emptyChartMessage}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                      <line x1="3" y1="20" x2="21" y2="20"></line>
                    </svg>
                    <p>No appearance history data available yet.</p>
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

        {/* Overlay for mobile when menu is open */}
        {isMobileMenuOpen && (
          <div className={styles.mobileOverlay} onClick={handleMenuToggle}></div>
        )}
      </div>
    </div>
  );
}