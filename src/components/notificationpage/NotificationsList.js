import React, { useState, useEffect } from 'react';
import NotificationItem from './NotificationItem';
import styles from './NotificationsList.module.css';

const NotificationsList = ({ notifications, activeTab, onNotificationUpdate, currentUser }) => {
  const [notificationItems, setNotificationItems] = useState(notifications || []);

  // Update when notifications prop changes
  useEffect(() => {
    setNotificationItems(notifications || []);
  }, [notifications]);
  
  // Handle updates from NotificationItem
  const handleUpdate = (action, notificationId) => {
    if (action === 'remove') {
      // Filter out the notification that was marked as read
      setNotificationItems(prev => 
        prev.filter(item => item._id !== notificationId)
      );
    }
    
    // Call parent update function if provided
    if (onNotificationUpdate) {
      onNotificationUpdate();
    }
  };

  if (!notificationItems || notificationItems.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <h3 className={styles.emptyStateTitle}>No notifications yet</h3>
        <p className={styles.emptyStateText}>When you receive notifications, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className={styles.notificationsList}>
      {notificationItems.map((notification) => (
        <NotificationItem
          key={notification._id}
          notification={notification}
          activeTab={activeTab}
          onUpdate={handleUpdate}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
};

export default NotificationsList;