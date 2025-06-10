// src/components/explore/ExploreSection.js
import React from 'react';
import ExploreItem from './ExploreItem';
import styles from './ExploreSection.module.css';

const ExploreSection = ({ title, items = [] }) => {
  // Check if we have any items to display
  const hasItems = items && items.length > 0;

  return (
    <div className={styles.section}>

      {hasItems ? (
        <div className={styles.gridContainer}>
          {items.map((item, index) => (
            <ExploreItem
              key={item.id || index}
              id={item.id}
              username={item.username}
              timeAgo={item.timeAgo}
              title={item.title}
              description={item.description}
              imageUrl={item.imageUrl}
              discussionCount={item.discussionCount}
              profilePicture={item.profilePicture}
              videoUrl={item.videoUrl}
              creatorLinks={item.creatorLinks || []}
              communityLinks={item.communityLinks || []}
            />
          ))}
        </div>
      ) : (
        <div className={styles.noContentContainer}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.noContentIcon}>
            <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
            <line x1="12" y1="12" x2="12" y2="12.01"></line>
            <path d="M8 12h.01"></path>
            <path d="M16 12h.01"></path>
          </svg>
          <h3 className={styles.noContentTitle}>No discussions found</h3>
          <p className={styles.noContentText}>Currently there are no discussions related to this category.</p>
        </div>
      )}
    </div>
  );
};

export default ExploreSection;