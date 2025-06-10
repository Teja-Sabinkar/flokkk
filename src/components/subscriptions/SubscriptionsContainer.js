import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import SubscriptionItem from './SubscriptionItem';
import SubscriptionPostItem from './SubscriptionPostItem';
import styles from './SubscriptionsContainer.module.css';

const SubscriptionsContainer = ({ 
  subscriptions = [], 
  feedPosts = [], 
  isLoading = false, 
  onLoadMore, 
  hasMore = false, 
  viewMode = 'grid',
  isExpanded = false 
}) => {
  const { theme } = useTheme();
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [visiblePosts, setVisiblePosts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);

  // Update visible posts when feedPosts change
  useEffect(() => {
    setVisiblePosts(feedPosts || []);
  }, [feedPosts]);

  // Fetch hidden posts on mount
  useEffect(() => {
    const fetchHiddenPosts = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/posts/hidden', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const hiddenIds = data.hiddenPosts.map(hp => hp.postId);
          setHiddenPostIds(hiddenIds);

          // Filter out already hidden posts
          if (hiddenIds.length > 0) {
            setVisiblePosts(current =>
              current.filter(post => {
                const postId = post.id || post._id;
                return !hiddenIds.includes(postId?.toString());
              })
            );
          }
        }
      } catch (error) {
        console.error('Error fetching hidden posts:', error);
      }
    };

    fetchHiddenPosts();
  }, []);

  // Handle hiding a post
  const handleHidePost = useCallback((postId) => {
    // Add to local hidden posts
    setHiddenPostIds(prev => [...prev, postId]);

    // Remove the post from the UI
    setVisiblePosts(prev =>
      prev.filter(post => {
        const id = post.id || post._id;
        return id !== postId;
      })
    );
  }, []);

  // Handle load more with intersection observer
  useEffect(() => {
    if (!hasMore || isLoading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && onLoadMore) {
          setLoadingMore(true);
          onLoadMore().finally(() => {
            setLoadingMore(false);
          });
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, loadingMore, onLoadMore]);

  // Show subscriptions list if we have subscriptions and no posts yet
  const showSubscriptionsList = subscriptions.length > 0 && visiblePosts.length === 0 && !isLoading;

  return (
    <div className={styles.container} data-theme={theme}>
      {/* Subscriptions List Section */}
      {showSubscriptionsList && (
        <div className={styles.subscriptionsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Your Subscriptions</h2>
            <p className={styles.sectionDescription}>
              Creators you're following ({subscriptions.length})
            </p>
          </div>
          
          <div className={`${styles.subscriptionsGrid} ${isExpanded ? styles.expanded : ''}`}>
            {subscriptions.map((subscription, index) => (
              <SubscriptionItem
                key={subscription.id || index}
                subscription={subscription}
                viewMode="grid"
              />
            ))}
          </div>
        </div>
      )}

      {/* Feed Posts Section */}
      {(visiblePosts.length > 0 || isLoading) && (
        <div className={styles.feedSection}>
          {subscriptions.length > 0 && (
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Latest from Your Subscriptions</h2>
              <p className={styles.sectionDescription}>
                Recent content from creators you follow
              </p>
            </div>
          )}

          <div className={`${styles.feedContainer} ${viewMode === 'list' ? styles.listView : styles.gridView} ${isExpanded ? styles.expanded : ''}`}>
            {visiblePosts.map((post, index) => (
              <SubscriptionPostItem
                key={post.id || post._id || index}
                post={post}
                viewMode={viewMode}
                onHidePost={handleHidePost}
              />
            ))}

            {/* Loading spinner for initial load */}
            {isLoading && visiblePosts.length === 0 && (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading your subscriptions feed...</p>
              </div>
            )}

            {/* Load more trigger */}
            {hasMore && !isLoading && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {loadingMore && (
                  <div className={styles.loadMoreSpinner}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading more posts...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && subscriptions.length === 0 && visiblePosts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className={styles.emptyStateTitle}>No Subscriptions Yet</h3>
          <p className={styles.emptyStateDescription}>
            Start following creators to see their latest content here. Discover new voices and stay updated with posts from your favorite creators.
          </p>
          <button 
            className={styles.exploreButton}
            onClick={() => window.location.href = '/explore'}
          >
            Explore Creators
          </button>
        </div>
      )}

      {/* No Posts from Subscriptions */}
      {!isLoading && subscriptions.length > 0 && visiblePosts.length === 0 && (
        <div className={styles.noPostsState}>
          <div className={styles.emptyStateIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="9" cy="9" r="2"></circle>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
            </svg>
          </div>
          <h3 className={styles.emptyStateTitle}>No Recent Posts</h3>
          <p className={styles.emptyStateDescription}>
            Your subscribed creators haven't posted recently. Check back later for new content!
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsContainer;