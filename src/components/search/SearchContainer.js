import React, { useState } from 'react';
import SearchResultItem from './SearchResultItem';
import ProfileResultItem from './ProfileResultItem';
import styles from './SearchContainer.module.css';

const SearchContainer = ({ 
  results, 
  isLoading,
  error,
  viewMode,
  onRetry,
  user
}) => {
  // Add state to track hidden posts
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  
  // No filtering - show all results including current user
  const filteredResults = results.filter(item => !hiddenPostIds.includes(item._id));
  
  // Handler for hiding posts
  const handleHidePost = (postId) => {
    setHiddenPostIds(prev => [...prev, postId]);
  };
  
  // Separate results into profiles and posts
  const profileResults = filteredResults.filter(result => result.type === 'profile');
  const postResults = filteredResults.filter(result => result.type === 'post');

  // Render loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Searching...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Error Searching</h3>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={onRetry}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {profileResults.length > 0 && (
        <div className={styles.resultGroup}>
          <h2 className={styles.groupHeading}>Profiles</h2>
          <div className={styles.horizontalScroll}>
            <div className={styles.profilesContainer}>
              {profileResults.map((profile, index) => (
                <div key={`profile-${profile._id}-${index}`} className={styles.profileCard}>
                  <ProfileResultItem 
                    profile={profile}
                    viewMode="grid"
                    currentUser={user}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {postResults.length > 0 && (
        <div className={styles.resultGroup}>
          <h2 className={styles.groupHeading}>Discussions</h2>
          <div className={`${styles.itemsGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
            {postResults.map((post, index) => (
              <SearchResultItem 
                key={`post-${post._id}-${index}`} 
                item={post} 
                viewMode={viewMode}
                onHidePost={handleHidePost}
              />
            ))}
          </div>
        </div>
      )}
      
      {profileResults.length === 0 && postResults.length === 0 && (
        <div className={styles.emptyContainer}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3>No Results Found</h3>
          <p>Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

export default SearchContainer;