import React, { useState, useMemo } from 'react';
import SearchResultItem from './SearchResultItem';
import ProfileResultItem from './ProfileResultItem';
import styles from './SearchContainer.module.css';

const SearchContainer = ({ 
  results = [], 
  isLoading = false,
  error = null,
  viewMode = 'grid',
  onRetry,
  user = null
}) => {
  // State for locally hidden posts (optimistic UI updates)
  const [locallyHiddenPostIds, setLocallyHiddenPostIds] = useState(new Set());
  
  // Memoized separation of results by type
  const { profileResults, postResults } = useMemo(() => {
    if (!Array.isArray(results)) {
      return { profileResults: [], postResults: [] };
    }

    // Filter out locally hidden posts and separate by type
    const visibleResults = results.filter(item => 
      !locallyHiddenPostIds.has(item._id)
    );

    const profiles = visibleResults.filter(result => 
      result.type === 'profile'
    );
    
    const posts = visibleResults.filter(result => 
      result.type === 'post'
    );

    return { 
      profileResults: profiles, 
      postResults: posts 
    };
  }, [results, locallyHiddenPostIds]);

  // Handler for hiding posts (optimistic UI update)
  const handleHidePost = (postId) => {
    if (postId) {
      setLocallyHiddenPostIds(prev => new Set([...prev, postId]));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} aria-hidden="true"></div>
          <p>Searching...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Error Searching</h3>
          <p>{typeof error === 'string' ? error : 'An unexpected error occurred'}</p>
          {onRetry && (
            <button 
              className={styles.retryButton} 
              onClick={onRetry}
              type="button"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate if we have any results to show
  const hasResults = profileResults.length > 0 || postResults.length > 0;

  // Empty state
  if (!hasResults) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyContainer}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3>No Results Found</h3>
          <p>Try adjusting your search terms or filters</p>
        </div>
      </div>
    );
  }

  // Results display
  return (
    <div className={styles.container}>
      {/* Profiles Section */}
      {profileResults.length > 0 && (
        <section className={styles.resultGroup}>
          <h2 className={styles.groupHeading}>
            Profiles ({profileResults.length})
          </h2>
          <div className={styles.horizontalScroll}>
            <div className={styles.profilesContainer} role="list">
              {profileResults.map((profile, index) => (
                <div 
                  key={`profile-${profile._id}-${index}`} 
                  className={styles.profileCard}
                  role="listitem"
                >
                  <ProfileResultItem 
                    profile={profile}
                    viewMode="grid"
                    currentUser={user}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Posts Section */}
      {postResults.length > 0 && (
        <section className={styles.resultGroup}>
          <h2 className={styles.groupHeading}>
            Discussions ({postResults.length})
          </h2>
          <div 
            className={`${styles.itemsGrid} ${viewMode === 'list' ? styles.listView : ''}`}
            role="list"
          >
            {postResults.map((post, index) => (
              <div
                key={`post-${post._id}-${index}`}
                role="listitem"
              >
                <SearchResultItem 
                  item={post} 
                  viewMode={viewMode}
                  onHidePost={handleHidePost}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SearchContainer;