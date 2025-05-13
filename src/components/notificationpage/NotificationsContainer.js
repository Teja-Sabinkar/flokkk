// NotificationsContainer.js
import React from 'react';
import styles from './NotificationsContainer.module.css';
import NotificationTabs from './NotificationTabs';
import SearchBar from './SearchBar';

const NotificationsContainer = ({ 
  children, 
  title,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  counts,
  onMarkAllRead // Handler for mark all as read
}) => {
  // Check if there are any unread notifications across all tabs
  const hasUnreadNotifications = 
    (counts?.commentsUnread > 0) || 
    (counts?.postsUnread > 0) || 
    (counts?.likesUnread > 0) || 
    (counts?.contributionsUnread > 0);
  
  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <h1 className={styles.title}>{title || 'Notifications'}</h1>
        {/* Show the button if there are any unread notifications */}
        {hasUnreadNotifications && (
          <button 
            className={styles.markAllReadButton}
            onClick={() => onMarkAllRead && onMarkAllRead('all')} // Pass 'all' parameter
          >
            Mark all as read
          </button>
        )}
      </div>
      <SearchBar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
      />
      <NotificationTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
      />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default NotificationsContainer;