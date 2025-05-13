import React, { useState } from 'react';
import styles from './SubscriptionsContainer.module.css';
import SubscriptionItem from './SubscriptionItem';
import SubscriptionPostItem from './SubscriptionPostItem';

const SubscriptionsContainer = ({ 
  subscriptions, 
  isLoading, 
  feedPosts = [],
  onLoadMore,
  hasMore,
  viewMode = 'grid' // New prop for view mode
}) => {
  const hasSubscriptions = subscriptions && subscriptions.length > 0;
  const hasFeedPosts = feedPosts && feedPosts.length > 0;
  
  // New state to track locally hidden posts
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  
  // Handle hiding posts from the UI
  const handleHidePost = (postId) => {
    // Add to local hidden posts
    setHiddenPostIds(prev => [...prev, postId]);
    
    // This will trigger a re-render and the post will be filtered out below
  };
  
  // Filter out locally hidden posts
  const visiblePosts = feedPosts.filter(post => {
    const postId = post.id || post._id;
    return !hiddenPostIds.includes(postId);
  });
  
  // Handle intersection observer for infinite scrolling
  const observerRef = React.useRef(null);
  const lastPostRef = React.useCallback(
    (node) => {
      if (isLoading) return;
      
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      // Create new observer
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore();
        }
      });
      
      // Observe the last post
      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isLoading, hasMore, onLoadMore]
  );

  // Render loading state
  if (isLoading && !hasSubscriptions && !hasFeedPosts) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!hasSubscriptions && !visiblePosts.length && !isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className={styles.emptyStateTitle}>No Subscriptions Yet</h3>
          <p className={styles.emptyStateText}>You haven't subscribed to any creators yet. Follow some creators to see their content here.</p>
          <button className={styles.exploreButton} onClick={() => window.location.href = '/explore'}>
            Explore Creators
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      
      {/* Subscription feed section */}
      {visiblePosts.length > 0 && (
        <div className={styles.feedSection}>
          <div className={`${styles.itemsContainer} ${viewMode === 'list' ? styles.listView : styles.gridView}`}>
            {visiblePosts.map((post, index) => {
              // Apply ref to last post for infinite scrolling
              const isLastPost = index === visiblePosts.length - 1;
              return (
                <div 
                  key={post.id}
                  ref={isLastPost ? lastPostRef : null}
                >
                  <SubscriptionPostItem 
                    post={post} 
                    viewMode={viewMode}
                    onHidePost={handleHidePost}
                  />
                </div>
              );
            })}
            
            {/* Loading indicator for infinite scroll */}
            {isLoading && hasMore && (
              <div className={styles.loadingMore}>
                <div className={styles.smallSpinner}></div>
                <span>Loading more posts...</span>
              </div>
            )}

          </div>
        </div>
      )}
      
      {/* Empty feed but has subscriptions */}
      {hasSubscriptions && !visiblePosts.length && !isLoading && (
        <div className={styles.emptyFeed}>
          <p>No recent posts from your subscriptions yet. Check back later!</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsContainer;